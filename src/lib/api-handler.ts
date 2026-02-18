import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSourceConfig, type SourceKey, type SourceInstanceMap } from '@/lib/config';
import { cacheFetch, cacheGetStale } from '@/lib/cache';

type EnrichedItem = Record<string, unknown>;

interface ApiRouteOptions<K extends SourceKey> {
  source: K;
  getCacheKey: (instanceId: string, req: NextRequest) => string;
  ttlMs: number;
  fetcher: (instance: SourceInstanceMap[K], req: NextRequest) => Promise<unknown[]>;
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

    const results = await Promise.allSettled(
      instances.map(async (instance) => {
        const cacheKey = options.getCacheKey(instance.id, req);

        try {
          const data = await cacheFetch<unknown[]>(
            cacheKey,
            options.ttlMs,
            () => options.fetcher(instance, req),
          );
          return data.map(item => ({
            ...(item as EnrichedItem),
            _instanceId: instance.id,
            _instanceName: instance.name,
          }));
        } catch (error) {
          const stale = await cacheGetStale<unknown[]>(cacheKey);
          if (stale) {
            return stale.map(item => ({
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

    const fulfilled = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<EnrichedItem[]>[];
    const data = fulfilled.flatMap(r => r.value);
    const hasErrors = results.some(r => r.status === 'rejected');

    return NextResponse.json({
      data,
      _stale: data.some(d => d._stale === true),
      _source: options.source,
      _timestamp: Date.now(),
      _partial: hasErrors && data.length > 0,
    });
  };
}
