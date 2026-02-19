import { createSummaryApiRoute } from '@/lib/api-handler';
import { getPRTGClient } from '@/lib/prtg';
import { CACHE_TTL } from '@/lib/constants';
import type { PRTGSummary } from '@/types/prtg';

export const dynamic = 'force-dynamic';

export const GET = createSummaryApiRoute<'prtg', PRTGSummary, PRTGSummary>({
  source: 'prtg',
  getCacheKey: (instanceId) => `dashboard:prtg:${instanceId}:summary`,
  ttlMs: CACHE_TTL.PRTG,
  fetcher: async (instance) => {
    const client = getPRTGClient(instance);

    // 3 parallel queries:
    // - devices (for device count)
    // - not(status = up) to get ALL non-up sensors in one call
    // - all sensors with limit=1 (just for X-Total-Count header)
    const [devicesResult, nonUpResult, allResult] = await Promise.all([
      client.getDevices(),
      client.getNonUpSensors(),
      client.requestWithMeta<unknown[]>('/experimental/sensors', { limit: '1' }),
    ]);
    const totalSensors = allResult.totalCount || 0;
    const nonUpCount = nonUpResult.totalCount || nonUpResult.data.length;
    const upCount = totalSensors - nonUpCount;

    // Count non-up sensors by normalized status
    const statusCounts = { Down: 0, Acknowledged: 0, Warning: 0, Paused: 0, Unusual: 0 };
    for (const s of nonUpResult.data) {
      if (s.status in statusCounts) statusCounts[s.status as keyof typeof statusCounts]++;
    }

    const summary: PRTGSummary = {
      sensors: {
        up: upCount,
        down: statusCounts.Down,
        acknowledged: statusCounts.Acknowledged,
        warning: statusCounts.Warning,
        paused: statusCounts.Paused,
        unusual: statusCounts.Unusual,
        total: totalSensors,
      },
      devices: { up: 0, down: 0, total: devicesResult.totalCount || devicesResult.data.length },
    };

    for (const device of devicesResult.data) {
      if (device.status === 'Down') summary.devices.down++;
      else if (device.status === 'Up') summary.devices.up++;
    }

    return summary;
  },
  aggregator: (results) => {
    const aggregated: PRTGSummary = {
      sensors: { up: 0, down: 0, acknowledged: 0, warning: 0, paused: 0, unusual: 0, total: 0 },
      devices: { up: 0, down: 0, total: 0 },
    };

    for (const r of results) {
      aggregated.sensors.up += r.sensors.up;
      aggregated.sensors.down += r.sensors.down;
      aggregated.sensors.acknowledged += r.sensors.acknowledged;
      aggregated.sensors.warning += r.sensors.warning;
      aggregated.sensors.paused += r.sensors.paused;
      aggregated.sensors.unusual += r.sensors.unusual;
      aggregated.sensors.total += r.sensors.total;
      aggregated.devices.up += r.devices.up;
      aggregated.devices.down += r.devices.down;
      aggregated.devices.total += r.devices.total;
    }

    return aggregated;
  },
});
