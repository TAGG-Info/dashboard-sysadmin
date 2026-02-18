import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RefreshIntervals {
  prtg: number;        // ms
  infra: number;       // ms (vcenter + proxmox)
  veeam: number;       // ms
  tickets: number;     // ms (glpi)
  transfers: number;   // ms (securetransport summary)
}

export type RefreshKey = keyof RefreshIntervals;

export const MIN_INTERVAL = 10_000; // 10s absolute floor

export const DEFAULT_INTERVALS: RefreshIntervals = {
  prtg: 30_000,
  infra: 60_000,
  veeam: 120_000,
  tickets: 60_000,
  transfers: 120_000,
};

const VALID_KEYS: RefreshKey[] = ['prtg', 'infra', 'veeam', 'tickets', 'transfers'];

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const INTERVALS_FILE = path.join(DATA_DIR, 'refresh-intervals.json');

// ---------------------------------------------------------------------------
// Env-var fallback (same vars the hooks currently read)
// ---------------------------------------------------------------------------

function envDefaults(): RefreshIntervals {
  return {
    prtg: Number(process.env.NEXT_PUBLIC_REFRESH_PRTG) || DEFAULT_INTERVALS.prtg,
    infra: Number(process.env.NEXT_PUBLIC_REFRESH_INFRA) || DEFAULT_INTERVALS.infra,
    veeam: Number(process.env.NEXT_PUBLIC_REFRESH_VEEAM) || DEFAULT_INTERVALS.veeam,
    tickets: Number(process.env.NEXT_PUBLIC_REFRESH_TICKETS) || DEFAULT_INTERVALS.tickets,
    transfers: Number(process.env.NEXT_PUBLIC_REFRESH_TRANSFERS) || DEFAULT_INTERVALS.transfers,
  };
}

function clamp(intervals: RefreshIntervals): RefreshIntervals {
  const result = { ...intervals };
  for (const key of VALID_KEYS) {
    result[key] = Math.max(MIN_INTERVAL, result[key]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// In-memory cache (10s TTL)
// ---------------------------------------------------------------------------

let cache: { data: RefreshIntervals; ts: number } | null = null;
const CACHE_TTL_MS = 10_000;

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

export async function readRefreshIntervals(): Promise<RefreshIntervals> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.data;
  }

  const defaults = envDefaults();

  try {
    const raw = await readFile(INTERVALS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const merged: RefreshIntervals = { ...defaults };
    for (const key of VALID_KEYS) {
      if (typeof parsed[key] === 'number' && parsed[key] > 0) {
        merged[key] = parsed[key];
      }
    }
    const result = clamp(merged);
    cache = { data: result, ts: Date.now() };
    return result;
  } catch {
    // File doesn't exist or is invalid → use env/defaults
    const result = clamp(defaults);
    cache = { data: result, ts: Date.now() };
    return result;
  }
}

export async function writeRefreshIntervals(partial: Partial<RefreshIntervals>): Promise<RefreshIntervals> {
  const current = await readRefreshIntervals();
  const merged = { ...current };

  for (const key of VALID_KEYS) {
    if (typeof partial[key] === 'number' && partial[key]! > 0) {
      merged[key] = partial[key]!;
    }
  }

  const result = clamp(merged);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(INTERVALS_FILE, JSON.stringify(result, null, 2), 'utf-8');

  // Invalidate cache
  cache = { data: result, ts: Date.now() };

  return result;
}
