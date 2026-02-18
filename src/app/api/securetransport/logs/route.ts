import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSourceConfig } from '@/lib/config';
import { getSTClient } from '@/lib/securetransport';
import { cacheGet, cacheSet, cacheGetStale } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const LOGS_TTL = 30_000; // 30s — logs change frequently

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') || 50), 200);
  const offset = Math.max(Number(searchParams.get('offset') || 0), 0);

  const instances = await getSourceConfig('securetransport');
  if (!instances.length) {
    return NextResponse.json(
      { error: 'No SecureTransport instances configured', source: 'securetransport' },
      { status: 502 }
    );
  }

  const results = await Promise.allSettled(
    instances.map(async (instance) => {
      const cacheKey = `dashboard:st:${instance.id}:logs:${limit}:${offset}`;

      const cached = await cacheGet<Record<string, unknown>>(cacheKey);
      if (cached) {
        return { ...cached, _instanceId: instance.id, _instanceName: instance.name };
      }

      try {
        const client = getSTClient(instance);
        const logs = await client.getTransferLogs(limit, offset);
        await cacheSet(cacheKey, logs, LOGS_TTL);
        return { ...logs, _instanceId: instance.id, _instanceName: instance.name };
      } catch (error) {
        const stale = await cacheGetStale<Record<string, unknown>>(cacheKey);
        if (stale) {
          return { ...stale, _instanceId: instance.id, _instanceName: instance.name, _stale: true };
        }
        throw error;
      }
    })
  );

  const fulfilled = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<Record<string, unknown>>[];
  const hasErrors = results.some(r => r.status === 'rejected');
  const isStale = fulfilled.some(r => r.value._stale === true);

  // Merge all instance logs into a single list sorted by startTime desc
  const allTransfers: Record<string, unknown>[] = [];
  let totalCount = 0;

  for (const { value } of fulfilled) {
    const rs = value.resultSet as { returnCount: number; totalCount: number } | undefined;
    if (rs) totalCount += rs.totalCount;
    const transfers = value.transfers as Record<string, unknown>[] | undefined;
    if (transfers) {
      allTransfers.push(
        ...transfers.map(t => ({ ...t, _instanceId: value._instanceId, _instanceName: value._instanceName }))
      );
    }
  }

  // Sort by startTime descending (most recent first)
  allTransfers.sort((a, b) => {
    const ta = (a.id as { mTransferStartTime: number })?.mTransferStartTime ?? 0;
    const tb = (b.id as { mTransferStartTime: number })?.mTransferStartTime ?? 0;
    return tb - ta;
  });

  return NextResponse.json({
    data: {
      transfers: allTransfers.slice(0, limit),
      resultSet: { returnCount: allTransfers.length, totalCount },
    },
    _stale: isStale,
    _source: 'securetransport',
    _timestamp: Date.now(),
    _partial: hasErrors && fulfilled.length > 0,
  });
}
