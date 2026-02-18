import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSourceConfig } from '@/lib/config';
import { getPRTGClient } from '@/lib/prtg';
import { cacheGet, cacheSet, cacheGetStale } from '@/lib/cache';
import { CACHE_TTL } from '@/lib/constants';
import type { PRTGSummary } from '@/types/prtg';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const instances = await getSourceConfig('prtg');
  if (!instances.length) {
    return NextResponse.json({ error: 'No PRTG instances configured', source: 'prtg' }, { status: 502 });
  }

  const results = await Promise.allSettled(
    instances.map(async (instance) => {
      const cacheKey = `dashboard:prtg:${instance.id}:summary`;

      const cached = await cacheGet<PRTGSummary>(cacheKey);
      if (cached) return { ...cached, _instanceId: instance.id, _instanceName: instance.name };

      try {
        const client = getPRTGClient(instance);
        const { data: devices } = await client.getDevices();

        const summary: PRTGSummary = {
          sensors: { up: 0, down: 0, warning: 0, paused: 0, unusual: 0, total: 0 },
          devices: { up: 0, down: 0, total: devices.length },
        };

        for (const device of devices) {
          if (device.status === 'Down') summary.devices.down++;
          else if (device.status === 'Up') summary.devices.up++;

          if (device.metrics?.sensors) {
            const s = device.metrics.sensors;
            summary.sensors.up += s.up;
            summary.sensors.down += s.down;
            summary.sensors.warning += s.warning;
            summary.sensors.paused += s.paused;
            summary.sensors.unusual += s.unusual;
            summary.sensors.total += s.total;
          }
        }

        await cacheSet(cacheKey, summary, CACHE_TTL.PRTG);
        return { ...summary, _instanceId: instance.id, _instanceName: instance.name };
      } catch (error) {
        const stale = await cacheGetStale<PRTGSummary>(cacheKey);
        if (stale) return { ...stale, _instanceId: instance.id, _instanceName: instance.name, _stale: true };
        throw error;
      }
    })
  );

  // Aggregate summaries across all instances
  const fulfilled = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<PRTGSummary & { _instanceId: string; _instanceName: string; _stale?: boolean }>[];
  const hasErrors = results.some(r => r.status === 'rejected');
  const isStale = fulfilled.some(r => r.value._stale === true);

  const aggregated: PRTGSummary = {
    sensors: { up: 0, down: 0, warning: 0, paused: 0, unusual: 0, total: 0 },
    devices: { up: 0, down: 0, total: 0 },
  };

  for (const { value } of fulfilled) {
    aggregated.sensors.up += value.sensors.up;
    aggregated.sensors.down += value.sensors.down;
    aggregated.sensors.warning += value.sensors.warning;
    aggregated.sensors.paused += value.sensors.paused;
    aggregated.sensors.unusual += value.sensors.unusual;
    aggregated.sensors.total += value.sensors.total;
    aggregated.devices.up += value.devices.up;
    aggregated.devices.down += value.devices.down;
    aggregated.devices.total += value.devices.total;
  }

  return NextResponse.json({
    data: aggregated,
    _stale: isStale,
    _source: 'prtg',
    _timestamp: Date.now(),
    _partial: hasErrors && fulfilled.length > 0,
  });
}
