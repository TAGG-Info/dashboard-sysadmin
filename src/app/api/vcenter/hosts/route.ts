import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSourceConfig } from '@/lib/config';
import { getVCenterClient } from '@/lib/vcenter';
import { cacheGet, cacheSet, cacheGetStale } from '@/lib/cache';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const instances = await getSourceConfig('vcenter');
  if (!instances.length) {
    return NextResponse.json({ error: 'No vCenter instances configured', source: 'vcenter' }, { status: 502 });
  }

  const results = await Promise.allSettled(
    instances.map(async (instance) => {
      const cacheKey = `dashboard:vcenter:${instance.id}:hosts`;

      const cached = await cacheGet<Record<string, unknown>[]>(cacheKey);
      if (cached) {
        return cached.map(host => ({ ...host, _instanceId: instance.id, _instanceName: instance.name }));
      }

      try {
        const client = getVCenterClient(instance);
        const [hosts, allVMs] = await Promise.all([
          client.getHosts(),
          client.getVMs().catch(() => []),
        ]);

        const enriched = hosts.map((host) => ({
          ...host,
          vm_count: allVMs.filter(vm => vm.host === host.host).length,
          running_vm_count: allVMs.filter(
            vm => vm.host === host.host && vm.power_state === 'POWERED_ON'
          ).length,
        }));

        await cacheSet(cacheKey, enriched, CACHE_TTL.VCENTER);
        return enriched.map(host => ({ ...host, _instanceId: instance.id, _instanceName: instance.name }));
      } catch (error) {
        const stale = await cacheGetStale<Record<string, unknown>[]>(cacheKey);
        if (stale) {
          return stale.map(host => ({ ...host, _instanceId: instance.id, _instanceName: instance.name, _stale: true }));
        }
        throw error;
      }
    })
  );

  const fulfilled = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<Record<string, unknown>[]>[];
  const data = fulfilled.flatMap(r => r.value);
  const hasErrors = results.some(r => r.status === 'rejected');

  return NextResponse.json({
    data,
    _stale: data.some(d => d._stale === true),
    _source: 'vcenter',
    _timestamp: Date.now(),
    _partial: hasErrors && data.length > 0,
  });
}
