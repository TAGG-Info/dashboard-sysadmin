import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSourceConfig, type SourceKey, type SourceInstanceMap } from '@/lib/config';
import { cacheFetch, cacheGetStale, cacheSet } from '@/lib/cache';
import { isCircuitOpen, recordFailure, recordSuccess } from '@/lib/circuit-breaker';

type EnrichedItem = Record<string, unknown>;

interface ApiRouteOptions<K extends SourceKey> {
  source: K;
  getCacheKey: (instanceId: string, req: NextRequest) => string;
  ttlMs: number;
  fetcher: (instance: SourceInstanceMap[K], req: NextRequest) => Promise<unknown[]>;
}

/** Per-instance result enriched with instance metadata. */
export type InstanceResult<T> = T & { _instanceId: string; _instanceName: string; _stale?: boolean };

interface SummaryApiRouteOptions<K extends SourceKey, TRaw, TAggregated> {
  source: K;
  getCacheKey: (instanceId: string, req: NextRequest) => string;
  ttlMs: number;
  fetcher: (instance: SourceInstanceMap[K], req: NextRequest) => Promise<TRaw>;
  aggregator: (results: InstanceResult<TRaw>[], req: NextRequest) => TAggregated;
}

/**
 * Factory qui crée un handler GET Next.js App Router pour une source de données.
 * Gère automatiquement : auth, multi-instances, cache, stale fallback, métadonnées.
 */
export function createApiRoute<K extends SourceKey>(options: ApiRouteOptions<K>) {
  return async function GET(req: NextRequest): Promise<NextResponse> {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instances = await getSourceConfig(options.source);
    if (!instances.length) {
      return NextResponse.json(
        { error: `No ${options.source} instances configured`, source: options.source },
        { status: 502 },
      );
    }

    const noCache = req.headers.get('x-no-cache') === '1' && session.user?.role === 'admin';

    const results = await Promise.allSettled(
      instances.map(async (instance) => {
        const cacheKey = options.getCacheKey(instance.id, req);

        // Circuit breaker: skip upstream if circuit is open, use stale directly
        if (isCircuitOpen(cacheKey)) {
          const stale = await cacheGetStale<unknown[]>(cacheKey);
          if (stale) {
            return stale.map((item) => ({
              ...(item as EnrichedItem),
              _instanceId: instance.id,
              _instanceName: instance.name,
              _stale: true,
            }));
          }
        }

        try {
          let data: unknown[];
          if (noCache) {
            data = await options.fetcher(instance, req);
            void cacheSet(cacheKey, data, options.ttlMs);
          } else {
            data = await cacheFetch<unknown[]>(cacheKey, options.ttlMs, () => options.fetcher(instance, req));
          }
          recordSuccess(cacheKey);
          return data.map((item) => ({
            ...(item as EnrichedItem),
            _instanceId: instance.id,
            _instanceName: instance.name,
          }));
        } catch (error) {
          recordFailure(cacheKey);
          const stale = await cacheGetStale<unknown[]>(cacheKey);
          if (stale) {
            return stale.map((item) => ({
              ...(item as EnrichedItem),
              _instanceId: instance.id,
              _instanceName: instance.name,
              _stale: true,
            }));
          }
          throw error;
        }
      }),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<EnrichedItem[]>[];
    const data = fulfilled.flatMap((r) => r.value);
    const hasErrors = results.some((r) => r.status === 'rejected');

    return NextResponse.json({
      data,
      _stale: data.some((d) => d._stale === true),
      _source: options.source,
      _timestamp: Date.now(),
      _partial: hasErrors && data.length > 0,
    });
  };
}

/**
 * Factory pour les routes qui agrègent les résultats de plusieurs instances
 * en un seul objet (summaries, stats, logs fusionnés, etc.).
 * Même boilerplate que createApiRoute : auth, multi-instances, cache, stale fallback.
 */
export function createSummaryApiRoute<K extends SourceKey, TRaw, TAggregated>(
  options: SummaryApiRouteOptions<K, TRaw, TAggregated>,
) {
  return async function GET(req: NextRequest): Promise<NextResponse> {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instances = await getSourceConfig(options.source);
    if (!instances.length) {
      return NextResponse.json(
        { error: `No ${options.source} instances configured`, source: options.source },
        { status: 502 },
      );
    }

    const noCache = req.headers.get('x-no-cache') === '1' && session.user?.role === 'admin';

    const results = await Promise.allSettled(
      instances.map(async (instance) => {
        const cacheKey = options.getCacheKey(instance.id, req);

        // Circuit breaker: skip upstream if circuit is open, use stale directly
        if (isCircuitOpen(cacheKey)) {
          const stale = await cacheGetStale<TRaw>(cacheKey);
          if (stale) {
            return {
              ...stale,
              _instanceId: instance.id,
              _instanceName: instance.name,
              _stale: true,
            } as InstanceResult<TRaw>;
          }
        }

        try {
          let data: TRaw;
          if (noCache) {
            data = await options.fetcher(instance, req);
            void cacheSet(cacheKey, data, options.ttlMs);
          } else {
            data = await cacheFetch<TRaw>(cacheKey, options.ttlMs, () => options.fetcher(instance, req));
          }
          recordSuccess(cacheKey);
          return {
            ...data,
            _instanceId: instance.id,
            _instanceName: instance.name,
          } as InstanceResult<TRaw>;
        } catch {
          recordFailure(cacheKey);
          const stale = await cacheGetStale<TRaw>(cacheKey);
          if (stale) {
            return {
              ...stale,
              _instanceId: instance.id,
              _instanceName: instance.name,
              _stale: true,
            } as InstanceResult<TRaw>;
          }
          throw new Error(`${options.source}/${instance.id}: fetch failed`);
        }
      }),
    );

    const fulfilled = (
      results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<InstanceResult<TRaw>>[]
    ).map((r) => r.value);
    const hasErrors = results.some((r) => r.status === 'rejected');
    const isStale = fulfilled.some((r) => r._stale === true);

    const aggregated = options.aggregator(fulfilled, req);

    return NextResponse.json({
      data: aggregated,
      _stale: isStale,
      _source: options.source,
      _timestamp: Date.now(),
      _partial: hasErrors && fulfilled.length > 0,
    });
  };
}
