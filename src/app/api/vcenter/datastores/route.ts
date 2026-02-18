import { type NextRequest } from 'next/server';
import { createApiRoute } from '@/lib/api-handler';
import { getVCenterClient } from '@/lib/vcenter';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const GET = createApiRoute({
  source: 'vcenter',
  getCacheKey: (instanceId) => `dashboard:vcenter:${instanceId}:datastores`,
  ttlMs: CACHE_TTL.VCENTER,
  fetcher: (instance) => getVCenterClient(instance).getDatastores(),
});
