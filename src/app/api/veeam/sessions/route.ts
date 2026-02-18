import { type NextRequest } from 'next/server';
import { createApiRoute } from '@/lib/api-handler';
import { getVeeamClient } from '@/lib/veeam';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const GET = createApiRoute({
  source: 'veeam',
  getCacheKey: (instanceId) => `dashboard:veeam:${instanceId}:sessions`,
  ttlMs: CACHE_TTL.VEEAM,
  fetcher: (instance) => getVeeamClient(instance).getSessions(),
});
