import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('encrypt / decrypt', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'test-secret-at-least-32-chars-long-ok!!';
    process.env.CRYPTO_SALT = 'test-salt-unique';
    vi.resetModules(); // resets the _derivedKey singleton between tests
  });

  it('round-trip : decrypt(encrypt(x)) === x', async () => {
    const { encrypt, decrypt } = await import('@/lib/config');
    const original = 'my-super-secret-api-key';
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it('chiffre des valeurs vides', async () => {
    const { encrypt, decrypt } = await import('@/lib/config');
    expect(decrypt(encrypt(''))).toBe('');
  });

  it('deux chiffrements du même texte donnent des résultats différents (IV aléatoire)', async () => {
    const { encrypt } = await import('@/lib/config');
    const a = encrypt('secret');
    const b = encrypt('secret');
    expect(a).not.toBe(b);
  });

  it('format attendu : hex:hex:hex', async () => {
    const { encrypt } = await import('@/lib/config');
    const result = encrypt('test');
    const parts = result.split(':');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toMatch(/^[0-9a-f]+$/);
    expect(parts[1]).toMatch(/^[0-9a-f]+$/);
    expect(parts[2]).toMatch(/^[0-9a-f]+$/);
  });

  it('lève une erreur si le format est invalide', async () => {
    const { decrypt } = await import('@/lib/config');
    expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted value format');
  });

  it('lève une erreur si NEXTAUTH_SECRET est absent', async () => {
    delete process.env.NEXTAUTH_SECRET;
    vi.resetModules();
    const { encrypt } = await import('@/lib/config');
    expect(() => encrypt('test')).toThrow('NEXTAUTH_SECRET is required');
  });
});
