import { createApiRoute } from '@/lib/api-handler';
import { getProxmoxClient } from '@/lib/proxmox';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const GET = createApiRoute({
  source: 'proxmox',
  getCacheKey: (instanceId) => `dashboard:proxmox:${instanceId}:vms`,
  ttlMs: CACHE_TTL.PROXMOX,
  fetcher: (instance) => getProxmoxClient(instance).getAllVMs(),
});
