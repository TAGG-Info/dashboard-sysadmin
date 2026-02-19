import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveRole } from '@/lib/roles';

// Mock fs to avoid actual file I/O
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockRejectedValue(new Error('File not found')),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

describe('resolveRole', () => {
  const original = process.env.LDAP_ADMIN_GROUP;

  beforeEach(() => {
    process.env.LDAP_ADMIN_GROUP = 'Dashboard-Admins';
  });

  afterEach(() => {
    if (original !== undefined) {
      process.env.LDAP_ADMIN_GROUP = original;
    } else {
      delete process.env.LDAP_ADMIN_GROUP;
    }
  });

  it('retourne admin si le groupe correspond (exact)', async () => {
    const role = await resolveRole(['CN=Dashboard-Admins,DC=corp,DC=com']);
    expect(role.id).toBe('admin');
  });

  it('retourne admin avec comparaison insensible à la casse', async () => {
    const role = await resolveRole(['CN=dashboard-admins,DC=corp,DC=com']);
    expect(role.id).toBe('admin');
  });

  it('retourne viewer si aucun groupe ne correspond', async () => {
    const role = await resolveRole(['CN=Viewers,DC=corp,DC=com']);
    expect(role.id).toBe('viewer');
  });

  it('retourne viewer pour un tableau vide', async () => {
    const role = await resolveRole([]);
    expect(role.id).toBe('viewer');
  });

  it('retourne admin si plusieurs groupes dont un correspond', async () => {
    const role = await resolveRole([
      'CN=Viewers,DC=corp,DC=com',
      'CN=Dashboard-Admins,DC=corp,DC=com',
      'CN=OtherGroup,DC=corp,DC=com',
    ]);
    expect(role.id).toBe('admin');
  });

  it('retourne viewer par défaut si LDAP_ADMIN_GROUP est absent et groupes ne correspondent pas', async () => {
    delete process.env.LDAP_ADMIN_GROUP;
    const role = await resolveRole(['CN=OtherGroup,DC=corp,DC=com']);
    expect(role.id).toBe('viewer');
  });

  it('le rôle viewer a toutes les pages dashboard mais pas /settings', async () => {
    const role = await resolveRole([]);
    expect(role.pages).toContain('/');
    expect(role.pages).toContain('/monitoring');
    expect(role.pages).not.toContain('/settings');
  });

  it('le rôle admin a toutes les pages y compris /settings', async () => {
    const role = await resolveRole(['CN=Dashboard-Admins,DC=corp,DC=com']);
    expect(role.pages).toContain('/settings');
    expect(role.pages).toContain('/');
  });
});
