import { createApiRoute } from '@/lib/api-handler';
import { cacheFetch } from '@/lib/cache';
import { getVCenterClient, getHostVMData, type HostVMData } from '@/lib/vcenter';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const GET = createApiRoute({
  source: 'vcenter',
  getCacheKey: (instanceId) => `dashboard:vcenter:${instanceId}:vms`,
  ttlMs: CACHE_TTL.VCENTER,
  fetcher: async (instance) => {
    const client = getVCenterClient(instance);
    const [vms, hosts] = await Promise.all([client.getVMs(), client.getHosts()]);

    // Shared cached mapping — avoids N+1 duplication between /vms and /hosts routes
    const { vmHostMap } = await cacheFetch<HostVMData>(
      `dashboard:vcenter:${instance.id}:vm-host-map`,
      CACHE_TTL.VCENTER,
      () => getHostVMData(client, hosts),
    );

    return vms.map((vm) => ({ ...vm, host: vmHostMap[vm.vm] ?? vm.host }));
  },
});
