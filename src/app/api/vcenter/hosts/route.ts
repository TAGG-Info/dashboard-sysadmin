import { createApiRoute } from '@/lib/api-handler';
import { getVCenterClient } from '@/lib/vcenter';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const GET = createApiRoute({
  source: 'vcenter',
  getCacheKey: (instanceId) => `dashboard:vcenter:${instanceId}:hosts`,
  ttlMs: CACHE_TTL.VCENTER,
  fetcher: async (instance) => {
    const client = getVCenterClient(instance);
    const hosts = await client.getHosts();

    // The /api/vcenter/vm endpoint does NOT include the "host" field,
    // so we query each host's VMs individually to get accurate counts.
    const hostVMCounts = await Promise.all(
      hosts.map(async (host) => {
        const hostVMs = await client.getVMsByHost(host.host).catch(() => []);
        return {
          hostId: host.host,
          total: hostVMs.length,
          running: hostVMs.filter(vm => vm.power_state === 'POWERED_ON').length,
        };
      })
    );

    const countMap = new Map(hostVMCounts.map(h => [h.hostId, h]));

    return hosts.map((host) => {
      const counts = countMap.get(host.host);
      return {
        ...host,
        vm_count: counts?.total ?? 0,
        running_vm_count: counts?.running ?? 0,
      };
    });
  },
});
