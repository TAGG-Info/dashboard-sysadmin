import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSourceConfig } from '@/lib/config';
import { getGLPIClient } from '@/lib/glpi';
import { cacheGet, cacheSet, cacheGetStale } from '@/lib/cache';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const instances = await getSourceConfig('glpi');
  if (!instances.length) {
    return NextResponse.json({ error: 'No GLPI instances configured', source: 'glpi' }, { status: 502 });
  }

  const results = await Promise.allSettled(
    instances.map(async (instance) => {
      const cacheKey = `dashboard:glpi:${instance.id}:summary`;

      const cached = await cacheGet<Record<string, unknown>>(cacheKey);
      if (cached) {
        return { ...cached, _instanceId: instance.id, _instanceName: instance.name };
      }

      try {
        const client = getGLPIClient(instance);
        const summary = await client.getTicketSummary();
        await cacheSet(cacheKey, summary, CACHE_TTL.GLPI);
        return { ...summary, _instanceId: instance.id, _instanceName: instance.name };
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
  const summaries = fulfilled.map(r => r.value);
  const hasErrors = results.some(r => r.status === 'rejected');
  const isStale = summaries.some(d => d._stale === true);

  // Aggregate all instance summaries into a single combined summary
  const aggregated = {
    total: 0,
    byStatus: {} as Record<number, number>,
    byPriority: {} as Record<number, number>,
    openCount: 0,
    criticalCount: 0,
    avgResolutionHours: undefined as number | undefined,
  };

  let resolutionSum = 0;
  let resolutionCount = 0;

  for (const s of summaries) {
    aggregated.total += (s.total as number) || 0;
    aggregated.openCount += (s.openCount as number) || 0;
    aggregated.criticalCount += (s.criticalCount as number) || 0;

    const byStatus = s.byStatus as Record<number, number> | undefined;
    if (byStatus) {
      for (const [k, v] of Object.entries(byStatus)) {
        aggregated.byStatus[Number(k)] = (aggregated.byStatus[Number(k)] || 0) + v;
      }
    }

    const byPriority = s.byPriority as Record<number, number> | undefined;
    if (byPriority) {
      for (const [k, v] of Object.entries(byPriority)) {
        aggregated.byPriority[Number(k)] = (aggregated.byPriority[Number(k)] || 0) + v;
      }
    }

    if (typeof s.avgResolutionHours === 'number') {
      resolutionSum += s.avgResolutionHours * ((s.total as number) || 1);
      resolutionCount += (s.total as number) || 1;
    }
  }

  if (resolutionCount > 0) {
    aggregated.avgResolutionHours = resolutionSum / resolutionCount;
  }

  return NextResponse.json({
    data: aggregated,
    _stale: isStale,
    _source: 'glpi',
    _timestamp: Date.now(),
    _partial: hasErrors && summaries.length > 0,
  });
}
