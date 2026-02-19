import { createApiRoute } from '@/lib/api-handler';
import { getPRTGClient } from '@/lib/prtg';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const GET = createApiRoute({
  source: 'prtg',
  getCacheKey: (instanceId, req) => {
    const d = req.nextUrl.searchParams.get('deviceId');
    return d ? `dashboard:prtg:${instanceId}:sensors:${d}` : `dashboard:prtg:${instanceId}:sensors`;
  },
  ttlMs: CACHE_TTL.PRTG,
  fetcher: async (instance, req) => {
    const deviceIdParam = req.nextUrl.searchParams.get('deviceId');
    const deviceId = deviceIdParam ? Number(deviceIdParam) : undefined;
    const r = await getPRTGClient(instance).getSensors(deviceId !== undefined ? { deviceId } : {});
    return r.data as unknown[];
  },
});
