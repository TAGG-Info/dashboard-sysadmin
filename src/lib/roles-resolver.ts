import type { DashboardRole } from '@/types/roles';
import { ALL_PAGE_PATHS } from '@/types/roles';

// ---------------------------------------------------------------------------
// Default roles
// ---------------------------------------------------------------------------

export function getDefaultRoles(): DashboardRole[] {
  return [
    {
      id: 'admin',
      name: 'Administrateur',
      adGroups: [process.env.LDAP_ADMIN_GROUP || 'Dashboard-Admins'],
      pages: [...ALL_PAGE_PATHS, '/settings'],
      isSystem: true,
    },
    {
      id: 'viewer',
      name: 'Lecteur',
      adGroups: [],
      pages: [...ALL_PAGE_PATHS],
      isSystem: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,31}$/;
export const VALID_PAGES = new Set([...ALL_PAGE_PATHS, '/settings']);

export function validateRole(role: unknown): role is DashboardRole {
  if (typeof role !== 'object' || role === null) return false;
  const r = role as Record<string, unknown>;

  if (typeof r.id !== 'string' || !SLUG_REGEX.test(r.id)) return false;
  if (typeof r.name !== 'string' || r.name.length === 0) return false;
  if (!Array.isArray(r.pages) || r.pages.length === 0) return false;
  if (!r.pages.every((p: unknown) => typeof p === 'string' && VALID_PAGES.has(p))) return false;
  if (!Array.isArray(r.adGroups) || !r.adGroups.every((g: unknown) => typeof g === 'string')) return false;
  if (r.isSystem !== undefined && typeof r.isSystem !== 'boolean') return false;

  return true;
}

// ---------------------------------------------------------------------------
// CN extraction from DN
// ---------------------------------------------------------------------------

/**
 * Extract the CN value from a full DN string.
 * e.g. "CN=GS-SYSADMINS,OU=Groups,DC=example,DC=com" → "GS-SYSADMINS"
 */
export function extractCN(dn: string): string {
  const match = dn.match(/^CN=([^,]+)/i);
  return match ? match[1] : dn;
}

// ---------------------------------------------------------------------------
// Role resolution (pure function — no I/O)
// ---------------------------------------------------------------------------

/**
 * Determine the role of a user based on their AD memberOf groups.
 * Takes a pre-loaded list of roles (no file I/O).
 */
export function resolveRoleFromList(groups: string[], roles: DashboardRole[]): DashboardRole {
  const userCNs = groups.map((g) => extractCN(g).toLowerCase());

  const matches: DashboardRole[] = [];
  for (const role of roles) {
    if (role.id === 'viewer') continue;
    const hasMatch = role.adGroups.some((adGroup) => userCNs.includes(adGroup.toLowerCase()));
    if (hasMatch) {
      matches.push(role);
    }
  }

  if (matches.length === 0) {
    const viewer = roles.find((r) => r.id === 'viewer');
    return viewer ?? getDefaultRoles()[1];
  }

  const adminMatch = matches.find((r) => r.id === 'admin');
  if (adminMatch) return adminMatch;

  return matches[0];
}
