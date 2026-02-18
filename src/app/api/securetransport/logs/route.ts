import { createSummaryApiRoute, type InstanceResult } from '@/lib/api-handler';
import { cacheGet, cacheSet } from '@/lib/cache';
import { getSTClient } from '@/lib/securetransport';
import type { STTransferLog } from '@/types/securetransport';

export const dynamic = 'force-dynamic';

const LOGS_TTL  = 30_000;      // 30s — données complètes (beaucoup de transferts)
const COUNT_TTL = 2  * 60_000; // 2 min — count seul, survit à l'expiration du cache data

// Stabilise le cache key : arrondi à l'heure la plus proche
const roundToHour = (ms: number) => Math.floor(ms / 3_600_000) * 3_600_000;

function buildFilterKey(searchParams: URLSearchParams): string {
  return [
    searchParams.get('account')   ? `a:${searchParams.get('account')}`   : '',
    searchParams.get('status')    ? `s:${searchParams.get('status')}`    : '',
    searchParams.get('protocol')  ? `p:${searchParams.get('protocol')}`  : '',
    searchParams.get('incoming') != null && searchParams.get('incoming') !== ''
      ? `i:${searchParams.get('incoming')}` : '',
    searchParams.get('startDate') ? `sd:${roundToHour(Number(searchParams.get('startDate')))}` : '',
    searchParams.get('endDate')   ? `ed:${roundToHour(Number(searchParams.get('endDate')))}` : '',
  ].filter(Boolean).join('|');
}

interface LogsRaw {
  resultSet: { returnCount: number; totalCount: number };
  transfers: STTransferLog[];
}

interface LogsAggregated {
  transfers: STTransferLog[];
  resultSet: { returnCount: number; totalCount: number };
}

export const GET = createSummaryApiRoute<'securetransport', LogsRaw, LogsAggregated>({
  source: 'securetransport',
  getCacheKey: (instanceId, req) => {
    const { searchParams } = new URL(req.url);
    const limit  = Math.min(Number(searchParams.get('limit')  || 50), 200);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);
    return `dashboard:st:${instanceId}:logs:${limit}:${offset}:${buildFilterKey(searchParams)}`;
  },
  ttlMs: LOGS_TTL,
  fetcher: async (instance, req) => {
    const { searchParams } = new URL(req.url);
    const limit  = Math.min(Number(searchParams.get('limit')  || 50), 200);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);
    const filters = {
      account:   searchParams.get('account')  || undefined,
      filename:  searchParams.get('filename') || undefined,
      status:    searchParams.get('status')   || undefined,
      protocol:  searchParams.get('protocol') || undefined,
      incoming:  searchParams.get('incoming') != null && searchParams.get('incoming') !== ''
        ? searchParams.get('incoming') === 'true'
        : undefined,
      startDate: searchParams.get('startDate') ? Number(searchParams.get('startDate')) : undefined,
      endDate:   searchParams.get('endDate')   ? Number(searchParams.get('endDate'))   : undefined,
    };

    // Count cache: survit à l'expiration du cache data (10 min > 5 min)
    // Quand le cache data expire, on récupère le count ici → 1 appel ST au lieu de 2
    const countKey = `dashboard:st:${instance.id}:logs:count:${buildFilterKey(searchParams)}`;
    const cachedCount = await cacheGet<number>(countKey);

    const client = getSTClient(instance);
    const result = await client.getTransferLogs(limit, offset, filters, cachedCount ?? undefined);

    // Persist count if it wasn't already cached
    if (cachedCount === null) {
      await cacheSet(countKey, result.resultSet.totalCount, COUNT_TTL);
    }

    return result as LogsRaw;
  },
  aggregator: (results: InstanceResult<LogsRaw>[], req) => {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200);

    let allTransfers: STTransferLog[] = [];
    let totalCount = 0;

    for (const r of results) {
      if (r.resultSet) totalCount += r.resultSet.totalCount;
      if (r.transfers) {
        allTransfers.push(
          ...r.transfers.map(t => ({ ...t, _instanceId: r._instanceId, _instanceName: r._instanceName }))
        );
      }
    }

    // Sort by timestamp desc (safety net for multi-instance merging)
    allTransfers.sort((a, b) =>
      ((b.id?.mTransferStartTime ?? 0) - (a.id?.mTransferStartTime ?? 0))
    );

    return {
      transfers: allTransfers.slice(0, limit),
      resultSet: { returnCount: allTransfers.length, totalCount },
    };
  },
});
