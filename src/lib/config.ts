import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { SourceConfig, SourceKey, SourceInstanceMap } from './config-types';
import { SENSITIVE_FIELDS } from './config-types';

// Re-export types for backward compatibility
export type { BaseInstance, PRTGInstance, VCenterInstance, ProxmoxInstance, VeeamInstance, GLPIInstance, STInstance, SourceConfig, LegacySourceConfig, SourceKey, SourceInstanceMap } from './config-types';
export { SENSITIVE_FIELDS } from './config-types';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// ---------------------------------------------------------------------------
// Encryption helpers  (AES-256-GCM)
// ---------------------------------------------------------------------------

let _derivedKey: Buffer | null = null;

function getDerivedKey(): Buffer {
  if (_derivedKey) return _derivedKey;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is required for config encryption');
  const salt = process.env.CRYPTO_SALT;
  if (!salt) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRYPTO_SALT is required in production for secure config encryption');
    }
    console.warn('[config] CRYPTO_SALT not set — using insecure fallback salt. Set CRYPTO_SALT in .env.local for production.');
  }
  const effectiveSalt = salt || 'dashboard-tagg-config-salt';
  _derivedKey = scryptSync(secret, effectiveSalt, 32);
  return _derivedKey;
}

export function encrypt(text: string): string {
  const key = getDerivedKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:ciphertext  (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encrypted: string): string {
  const key = getDerivedKey();
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

// ---------------------------------------------------------------------------
// Internal: encrypt / decrypt an entire SourceConfig object (array-based)
// ---------------------------------------------------------------------------

function encryptConfig(config: SourceConfig): SourceConfig {
  const out: SourceConfig = {};
  for (const [source, fields] of Object.entries(SENSITIVE_FIELDS)) {
    const srcKey = source as SourceKey;
    const instances = config[srcKey];
    if (!instances || !Array.isArray(instances)) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (out as any)[srcKey] = (instances as any[]).map((instance) => {
      const copy = { ...instance } as Record<string, string>;
      for (const field of fields) {
        if (copy[field]) {
          copy[field] = encrypt(copy[field]);
        }
      }
      return copy;
    });
  }
  return out;
}

function decryptConfig(config: SourceConfig): SourceConfig {
  const out: SourceConfig = {};
  for (const [source, fields] of Object.entries(SENSITIVE_FIELDS)) {
    const srcKey = source as SourceKey;
    const instances = config[srcKey];
    if (!instances || !Array.isArray(instances)) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (out as any)[srcKey] = (instances as any[]).map((instance) => {
      const copy = { ...instance } as Record<string, string>;
      for (const field of fields) {
        if (copy[field]) {
          try {
            copy[field] = decrypt(copy[field]);
          } catch {
            // If decryption fails, leave as-is (may be plain text from migration)
          }
        }
      }
      return copy;
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Legacy migration: auto-convert old single-object format to array format
// ---------------------------------------------------------------------------

function migrateIfNeeded(raw: Record<string, unknown>): SourceConfig {
  const migrated: SourceConfig = {};
  const sourceKeys: SourceKey[] = ['prtg', 'vcenter', 'proxmox', 'veeam', 'glpi', 'securetransport'];

  for (const key of sourceKeys) {
    const value = raw[key];
    if (!value) continue;

    if (Array.isArray(value)) {
      // Already in new array format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (migrated as any)[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      // Old single-object format -> wrap in array with default id/name
      const legacy = value as Record<string, string>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (migrated as any)[key] = [{ id: 'default', name: 'Default', ...legacy }];
    }
  }

  return migrated;
}

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

export async function readConfig(): Promise<SourceConfig> {
  try {
    const raw = await readFile(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    // Migrate old format if needed, then decrypt
    const migrated = migrateIfNeeded(parsed);
    return decryptConfig(migrated);
  } catch {
    // File doesn't exist or is invalid -> return empty config
    return {};
  }
}

export async function writeConfig(config: SourceConfig): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const encrypted = encryptConfig(config);
  await writeFile(CONFIG_FILE, JSON.stringify(encrypted, null, 2), 'utf-8');
  // Invalidate in-memory cache after writing
  configCache = null;
}

// ---------------------------------------------------------------------------
// Per-source getter with env-var fallback + in-memory cache
// ---------------------------------------------------------------------------

let configCache: { data: SourceConfig; ts: number } | null = null;
const CACHE_TTL_MS = 10_000; // 10 seconds

async function getCachedConfig(): Promise<SourceConfig> {
  if (configCache && Date.now() - configCache.ts < CACHE_TTL_MS) {
    return configCache.data;
  }
  const data = await readConfig();
  configCache = { data, ts: Date.now() };
  return data;
}

// Env-var fallback builders for each source – returns a single-element array
function envFallback<K extends SourceKey>(source: K): SourceInstanceMap[K][] | null {
  switch (source) {
    case 'prtg': {
      const baseUrl = process.env.PRTG_BASE_URL;
      const apiKey = process.env.PRTG_API_KEY;
      if (!baseUrl) return null;
      return [{ id: 'default', name: 'Default', baseUrl, apiKey: apiKey || '', externalUrl: process.env.PRTG_EXTERNAL_URL || baseUrl }] as SourceInstanceMap[K][];
    }
    case 'vcenter': {
      const baseUrl = process.env.VCENTER_BASE_URL;
      if (!baseUrl) return null;
      return [{
        id: 'default', name: 'Default',
        baseUrl,
        username: process.env.VCENTER_USERNAME || '',
        password: process.env.VCENTER_PASSWORD || '',
        externalUrl: process.env.VCENTER_EXTERNAL_URL || baseUrl,
      }] as SourceInstanceMap[K][];
    }
    case 'proxmox': {
      const baseUrl = process.env.PROXMOX_BASE_URL;
      if (!baseUrl) return null;
      return [{
        id: 'default', name: 'Default',
        baseUrl,
        tokenId: process.env.PROXMOX_TOKEN_ID || '',
        tokenSecret: process.env.PROXMOX_TOKEN_SECRET || '',
        externalUrl: process.env.PROXMOX_EXTERNAL_URL || baseUrl,
      }] as SourceInstanceMap[K][];
    }
    case 'veeam': {
      const baseUrl = process.env.VEEAM_BASE_URL;
      if (!baseUrl) return null;
      return [{
        id: 'default', name: 'Default',
        baseUrl,
        username: process.env.VEEAM_USERNAME || '',
        password: process.env.VEEAM_PASSWORD || '',
        externalUrl: process.env.VEEAM_EXTERNAL_URL || baseUrl,
      }] as SourceInstanceMap[K][];
    }
    case 'glpi': {
      const baseUrl = process.env.GLPI_BASE_URL;
      if (!baseUrl) return null;
      return [{
        id: 'default', name: 'Default',
        baseUrl,
        appToken: process.env.GLPI_APP_TOKEN || '',
        userToken: process.env.GLPI_USER_TOKEN || '',
        externalUrl: process.env.GLPI_EXTERNAL_URL || baseUrl,
      }] as SourceInstanceMap[K][];
    }
    case 'securetransport': {
      const baseUrl = process.env.ST_BASE_URL;
      if (!baseUrl) return null;
      return [{
        id: 'default', name: 'Default',
        baseUrl,
        username: process.env.ST_USERNAME || '',
        password: process.env.ST_PASSWORD || '',
        apiVersion: process.env.ST_API_VERSION || 'v2.0',
        externalUrl: process.env.ST_EXTERNAL_URL || baseUrl,
      }] as SourceInstanceMap[K][];
    }
    default:
      return null;
  }
}

/**
 * Returns the full array of instances for a source (or empty array).
 */
export async function getSourceConfig<K extends SourceKey>(
  source: K,
): Promise<SourceInstanceMap[K][]> {
  const config = await getCachedConfig();
  const instances = config[source] as SourceInstanceMap[K][] | undefined;
  if (instances && instances.length > 0) return instances;
  // Fallback to env vars
  return envFallback(source) ?? [];
}

/**
 * Returns one specific instance by instanceId (or null).
 */
export async function getSourceInstance<K extends SourceKey>(
  source: K,
  instanceId: string,
): Promise<SourceInstanceMap[K] | null> {
  const instances = await getSourceConfig(source);
  return instances.find(i => i.id === instanceId) ?? null;
}

