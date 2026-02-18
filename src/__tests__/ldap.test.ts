import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAdmin } from '@/lib/ldap';

describe('isAdmin', () => {
  const original = process.env.LDAP_ADMIN_GROUP;

  afterEach(() => {
    if (original !== undefined) {
      process.env.LDAP_ADMIN_GROUP = original;
    } else {
      delete process.env.LDAP_ADMIN_GROUP;
    }
  });

  it('retourne true si le groupe correspond (exact)', () => {
    process.env.LDAP_ADMIN_GROUP = 'Dashboard-Admins';
    expect(isAdmin(['CN=Dashboard-Admins,DC=corp,DC=com'])).toBe(true);
  });

  it('retourne true avec comparaison insensible à la casse', () => {
    process.env.LDAP_ADMIN_GROUP = 'Dashboard-Admins';
    expect(isAdmin(['CN=dashboard-admins,DC=corp,DC=com'])).toBe(true);
  });

  it('retourne false si aucun groupe ne correspond', () => {
    process.env.LDAP_ADMIN_GROUP = 'Dashboard-Admins';
    expect(isAdmin(['CN=Viewers,DC=corp,DC=com'])).toBe(false);
  });

  it('retourne false pour un tableau vide', () => {
    process.env.LDAP_ADMIN_GROUP = 'Dashboard-Admins';
    expect(isAdmin([])).toBe(false);
  });

  it('utilise "Dashboard-Admins" par défaut si LDAP_ADMIN_GROUP est absent', () => {
    delete process.env.LDAP_ADMIN_GROUP;
    expect(isAdmin(['CN=Dashboard-Admins,DC=corp,DC=com'])).toBe(true);
  });

  it('retourne false si LDAP_ADMIN_GROUP absent et groupes ne correspondent pas', () => {
    delete process.env.LDAP_ADMIN_GROUP;
    expect(isAdmin(['CN=OtherGroup,DC=corp,DC=com'])).toBe(false);
  });

  it('retourne true si plusieurs groupes dont un correspond', () => {
    process.env.LDAP_ADMIN_GROUP = 'Dashboard-Admins';
    expect(isAdmin([
      'CN=Viewers,DC=corp,DC=com',
      'CN=Dashboard-Admins,DC=corp,DC=com',
      'CN=OtherGroup,DC=corp,DC=com',
    ])).toBe(true);
  });
});
