import { type NextRequest } from 'next/server';
import { createApiRoute } from '@/lib/api-handler';
import { getPRTGClient } from '@/lib/prtg';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const GET = createApiRoute({
  source: 'prtg',
  getCacheKey: (instanceId) => `dashboard:prtg:${instanceId}:alerts`,
  ttlMs: CACHE_TTL.PRTG,
  fetcher: async (instance) => {
    const r = await getPRTGClient(instance).getAlerts();
    return r.data as unknown[];
  },
});
