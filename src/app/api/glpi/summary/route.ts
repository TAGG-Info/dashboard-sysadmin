import { createSummaryApiRoute, type InstanceResult } from '@/lib/api-handler';
import { getGLPIClient } from '@/lib/glpi';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

interface GLPISummaryRaw {
  total: number;
  byStatus: Record<number, number>;
  byPriority: Record<number, number>;
  openCount: number;
  criticalCount: number;
  avgResolutionHours?: number;
}

interface GLPISummaryAggregated extends Omit<GLPISummaryRaw, 'avgResolutionHours'> {
  avgResolutionHours: number | undefined;
}

export const GET = createSummaryApiRoute<'glpi', GLPISummaryRaw, GLPISummaryAggregated>({
  source: 'glpi',
  getCacheKey: (instanceId) => `dashboard:glpi:${instanceId}:summary`,
  ttlMs: CACHE_TTL.GLPI,
  fetcher: async (instance) => {
    const client = getGLPIClient(instance);
    return await client.getTicketSummary() as GLPISummaryRaw;
  },
  aggregator: (results: InstanceResult<GLPISummaryRaw>[]) => {
    const aggregated: GLPISummaryAggregated = {
      total: 0,
      byStatus: {},
      byPriority: {},
      openCount: 0,
      criticalCount: 0,
      avgResolutionHours: undefined,
    };

    let resolutionSum = 0;
    let resolutionCount = 0;

    for (const s of results) {
      aggregated.total += s.total || 0;
      aggregated.openCount += s.openCount || 0;
      aggregated.criticalCount += s.criticalCount || 0;

      if (s.byStatus) {
        for (const [k, v] of Object.entries(s.byStatus)) {
          aggregated.byStatus[Number(k)] = (aggregated.byStatus[Number(k)] || 0) + v;
        }
      }

      if (s.byPriority) {
        for (const [k, v] of Object.entries(s.byPriority)) {
          aggregated.byPriority[Number(k)] = (aggregated.byPriority[Number(k)] || 0) + v;
        }
      }

      if (typeof s.avgResolutionHours === 'number') {
        resolutionSum += s.avgResolutionHours * (s.total || 1);
        resolutionCount += s.total || 1;
      }
    }

    if (resolutionCount > 0) {
      aggregated.avgResolutionHours = resolutionSum / resolutionCount;
    }

    return aggregated;
  },
});
