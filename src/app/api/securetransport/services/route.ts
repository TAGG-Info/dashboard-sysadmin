import { createApiRoute } from '@/lib/api-handler';
import { getSTClient } from '@/lib/securetransport';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const GET = createApiRoute<'securetransport'>({
  source: 'securetransport',
  getCacheKey: (instanceId) => `dashboard:st:${instanceId}:services`,
  ttlMs: CACHE_TTL.ST,
  fetcher: async (instance) => {
    const client = getSTClient(instance);
    return await client.getServicesStatus();
  },
});
