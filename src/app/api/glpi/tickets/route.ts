import { type NextRequest } from 'next/server';
import { createApiRoute } from '@/lib/api-handler';
import { getGLPIClient } from '@/lib/glpi';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const GET = createApiRoute({
  source: 'glpi',
  getCacheKey: (instanceId) => `dashboard:glpi:${instanceId}:tickets`,
  ttlMs: CACHE_TTL.GLPI,
  fetcher: (instance) => getGLPIClient(instance).getTickets(),
});
