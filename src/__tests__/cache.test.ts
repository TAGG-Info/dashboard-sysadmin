import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cacheGet, cacheSet, cacheGetStale } from '@/lib/cache';

// Force in-memory fallback (no REDIS_URL)
beforeEach(() => {
  delete process.env.REDIS_URL;
});

describe('cache — fallback mémoire (sans Redis)', () => {
  it('retourne null si la clé est absente', async () => {
    const result = await cacheGet('test:missing-key');
    expect(result).toBeNull();
  });

  it('retourne la valeur si dans le TTL', async () => {
    await cacheSet('test:key1', { foo: 'bar' }, 60_000);
    const result = await cacheGet<{ foo: string }>('test:key1');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('retourne null si le TTL est dépassé', async () => {
    vi.useFakeTimers();
    await cacheSet('test:expired', { x: 1 }, 1_000);
    vi.advanceTimersByTime(2_000); // TTL dépassé
    const result = await cacheGet('test:expired');
    expect(result).toBeNull();
    vi.useRealTimers();
  });

  it('stocke différents types de données', async () => {
    await cacheSet('test:array', [1, 2, 3], 60_000);
    await cacheSet('test:string', 'hello', 60_000);
    await cacheSet('test:number', 42, 60_000);

    expect(await cacheGet('test:array')).toEqual([1, 2, 3]);
    expect(await cacheGet('test:string')).toBe('hello');
    expect(await cacheGet('test:number')).toBe(42);
  });
});

describe('cacheGetStale — données périmées', () => {
  it('retourne null si la clé est absente', async () => {
    const result = await cacheGetStale('test:stale-missing');
    expect(result).toBeNull();
  });

  it('retourne la valeur dans la fenêtre stale (TTL * STALE_MULTIPLIER)', async () => {
    vi.useFakeTimers();
    // TTL = 1s, STALE_MULTIPLIER = 5, fenêtre stale = 5s
    await cacheSet('test:stale-key', { stale: true }, 1_000);
    vi.advanceTimersByTime(3_000); // > TTL mais < TTL * 5

    // cacheGet doit retourner null (expiré)
    const fresh = await cacheGet('test:stale-key');
    expect(fresh).toBeNull();

    // cacheGetStale doit retourner la valeur (dans la fenêtre stale)
    const stale = await cacheGetStale<{ stale: boolean }>('test:stale-key');
    expect(stale).toEqual({ stale: true });
    vi.useRealTimers();
  });

  it('retourne null en dehors de la fenêtre stale', async () => {
    vi.useFakeTimers();
    await cacheSet('test:too-stale', { x: 1 }, 1_000);
    vi.advanceTimersByTime(6_000); // > TTL * 5
    const result = await cacheGetStale('test:too-stale');
    expect(result).toBeNull();
    vi.useRealTimers();
  });
});
