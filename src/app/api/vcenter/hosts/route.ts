import { createApiRoute } from '@/lib/api-handler';
import { cacheFetch } from '@/lib/cache';
import { getVCenterClient, getHostVMData, type HostVMData } from '@/lib/vcenter';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const GET = createApiRoute({
  source: 'vcenter',
  getCacheKey: (instanceId) => `dashboard:vcenter:${instanceId}:hosts`,
  ttlMs: CACHE_TTL.VCENTER,
  fetcher: async (instance) => {
    const client = getVCenterClient(instance);
    const hosts = await client.getHosts();

    // Shared cached mapping — avoids N+1 duplication between /vms and /hosts routes
    const { hostCounts } = await cacheFetch<HostVMData>(
      `dashboard:vcenter:${instance.id}:vm-host-map`,
      CACHE_TTL.VCENTER,
      () => getHostVMData(client, hosts),
    );

    return hosts.map((host) => {
      const counts = hostCounts[host.host];
      return {
        ...host,
        vm_count: counts?.total ?? 0,
        running_vm_count: counts?.running ?? 0,
      };
    });
  },
});
