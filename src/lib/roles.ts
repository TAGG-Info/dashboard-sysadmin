import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { DashboardRole } from '@/types/roles';
import { getDefaultRoles, validateRole, resolveRoleFromList } from './roles-resolver';

// Re-export for backward compatibility (API routes, tests)
export { getDefaultRoles, validateRole, resolveRoleFromList } from './roles-resolver';
export { SLUG_REGEX, VALID_PAGES } from './roles-resolver';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const ROLES_FILE = path.join(DATA_DIR, 'roles.json');

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

export async function readRoles(): Promise<DashboardRole[]> {
  try {
    const raw = await readFile(ROLES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return getDefaultRoles();
    }
    const valid = parsed.filter((r: unknown) => {
      if (validateRole(r)) return true;
      console.warn(`[roles] Invalid role entry filtered out: ${JSON.stringify(r)}`);
      return false;
    });
    return valid.length > 0 ? valid : getDefaultRoles();
  } catch {
    return getDefaultRoles();
  }
}

export async function writeRoles(roles: DashboardRole[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(ROLES_FILE, JSON.stringify(roles, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Role resolution (async — reads from disk then delegates to pure resolver)
// ---------------------------------------------------------------------------

export async function resolveRole(groups: string[]): Promise<DashboardRole> {
  const roles = await readRoles();
  return resolveRoleFromList(groups, roles);
}
