import type { CacheEntry } from '@/types/common';
import { CACHE_TTL } from '@/lib/constants';
import { loggers } from '@/lib/logger';

let redis: import('ioredis').default | null = null;
let redisFailed = false;

async function getRedis(): Promise<import('ioredis').default | null> {
  if (redisFailed) return null;
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    redisFailed = true;
    return null;
  }

  try {
    const Redis = (await import('ioredis')).default;
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    await redis.connect();
    return redis;
  } catch {
    loggers.cache.warn('Redis connection failed, using in-memory fallback');
    redisFailed = true;
    redis = null;
    return null;
  }
}

// In-memory fallback with FIFO eviction
const MAX_MEMORY_ENTRIES = 500;
const memoryCache = new Map<string, string>();
const memoryTimers = new Map<string, ReturnType<typeof setTimeout>>();

// In-flight deduplication: prevents cache stampede when multiple concurrent requests
// arrive for the same key with an empty/expired cache.
const inFlight = new Map<string, Promise<unknown>>();

function memoryEvict(): void {
  // FIFO eviction: delete the oldest entry (first key in Map insertion order)
  const oldest = memoryCache.keys().next().value;
  if (oldest !== undefined) {
    const timer = memoryTimers.get(oldest);
    if (timer) clearTimeout(timer);
    memoryTimers.delete(oldest);
    memoryCache.delete(oldest);
  }
}

function memorySet(key: string, value: string, maxTtlMs: number): void {
  // FIFO: evict if at capacity (skip if updating existing key)
  if (!memoryCache.has(key)) {
    while (memoryCache.size >= MAX_MEMORY_ENTRIES) {
      memoryEvict();
    }
  }

  memoryCache.set(key, value);

  // Clear existing timer
  const existing = memoryTimers.get(key);
  if (existing) clearTimeout(existing);

  // Set expiry timer
  const timer = setTimeout(() => {
    memoryCache.delete(key);
    memoryTimers.delete(key);
  }, maxTtlMs);

  // Unref timer so it doesn't keep the process alive
  if (typeof timer === 'object' && 'unref' in timer) {
    timer.unref();
  }

  memoryTimers.set(key, timer);
}

function memoryGet(key: string): string | null {
  return memoryCache.get(key) ?? null;
}

/**
 * Get fresh cached data (within TTL).
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedis();
    let raw: string | null = null;

    if (client) {
      raw = await client.get(key);
    } else {
      raw = memoryGet(key);
    }

    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;

    if (age < entry.ttl) {
      return entry.data;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Store data in cache with the given TTL.
 */
export async function cacheSet<T>(key: string, data: T, ttlMs: number): Promise<void> {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  };

  const json = JSON.stringify(entry);
  const totalTtlSeconds = Math.ceil((ttlMs * CACHE_TTL.STALE_MULTIPLIER) / 1000);
  const totalTtlMs = ttlMs * CACHE_TTL.STALE_MULTIPLIER;

  try {
    const client = await getRedis();

    if (client) {
      await client.set(key, json, 'EX', totalTtlSeconds);
    } else {
      memorySet(key, json, totalTtlMs);
    }
  } catch {
    loggers.cache.warn({ key }, 'Redis set failed, falling back to memory');
    memorySet(key, json, totalTtlMs);
  }
}

/**
 * Stale-while-revalidate fetch with deduplication.
 * 1. Fresh cache hit → return immediately
 * 2. Stale cache hit → return stale data + fire-and-forget background revalidation
 * 3. Cold miss → block on fetch (deduplicated via inFlight map)
 */
export async function cacheFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  // 1. Fresh cache → instant return
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  // 2. Stale cache → return immediately, revalidate in background
  const stale = await cacheGetStale<T>(key);
  if (stale !== null) {
    if (!inFlight.has(key)) {
      const revalidate = fetcher()
        .then(async (data) => {
          await cacheSet(key, data, ttlMs);
          return data;
        })
        .finally(() => {
          inFlight.delete(key);
        });
      inFlight.set(key, revalidate);
      // Safety timeout: ensure inFlight entry is cleaned up even if promise hangs
      setTimeout(() => inFlight.delete(key), ttlMs * CACHE_TTL.STALE_MULTIPLIER);
    }
    return stale;
  }

  // 3. Cold miss → block on fetch (deduplicated)
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetcher()
    .then(async (data) => {
      await cacheSet(key, data, ttlMs);
      return data;
    })
    .catch((err) => {
      throw err;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/**
 * Get stale cached data (within TTL * STALE_MULTIPLIER).
 * Used as fallback when the upstream API is unavailable.
 */
export async function cacheGetStale<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedis();
    let raw: string | null = null;

    if (client) {
      raw = await client.get(key);
    } else {
      raw = memoryGet(key);
    }

    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;

    if (age < entry.ttl * CACHE_TTL.STALE_MULTIPLIER) {
      return entry.data;
    }

    return null;
  } catch {
    return null;
  }
}
