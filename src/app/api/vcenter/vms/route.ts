import { createApiRoute } from '@/lib/api-handler';
import { getVCenterClient } from '@/lib/vcenter';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const GET = createApiRoute({
  source: 'vcenter',
  getCacheKey: (instanceId) => `dashboard:vcenter:${instanceId}:vms`,
  ttlMs: CACHE_TTL.VCENTER,
  fetcher: async (instance) => {
    const client = getVCenterClient(instance);

    // Fetch VMs and hosts in parallel.
    // The /api/vcenter/vm endpoint does NOT include the "host" field — we must
    // resolve it by querying which VMs belong to each host.
    const [vms, hosts] = await Promise.all([
      client.getVMs(),
      client.getHosts(),
    ]);

    // For each host, get its VM list in parallel to build vmId → hostId map.
    const hostMappings = await Promise.all(
      hosts.map(async (host) => {
        const hostVMs = await client.getVMsByHost(host.host).catch(() => []);
        return { hostId: host.host, vmIds: hostVMs.map((vm) => vm.vm) };
      })
    );

    const vmHostMap = new Map<string, string>();
    for (const { hostId, vmIds } of hostMappings) {
      for (const vmId of vmIds) {
        vmHostMap.set(vmId, hostId);
      }
    }

    return vms.map((vm) => ({
      ...vm,
      host: vmHostMap.get(vm.vm) ?? vm.host,
    }));
  },
});
