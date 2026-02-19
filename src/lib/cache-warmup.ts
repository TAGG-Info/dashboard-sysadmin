import { getSourceConfig } from '@/lib/config';
import { cacheSet } from '@/lib/cache';
import { CACHE_TTL } from '@/lib/constants';
import { loggers } from '@/lib/logger';
import { getPRTGClient } from '@/lib/prtg';
import { getVCenterClient, getHostVMData } from '@/lib/vcenter';
import { getProxmoxClient } from '@/lib/proxmox';
import { getVeeamClient } from '@/lib/veeam';
import { getGLPIClient } from '@/lib/glpi';
import { getSTClient } from '@/lib/securetransport';

/**
 * Warm up all source caches by calling upstream APIs directly.
 * Uses the same cache keys as the API routes so the next request gets a cache hit.
 * Runs in instrumentation.ts via Croner every 2 minutes.
 */
export async function warmupAllSources(): Promise<void> {
  const results = await Promise.allSettled([
    warmupPRTG(),
    warmupVCenter(),
    warmupProxmox(),
    warmupVeeam(),
    warmupGLPI(),
    warmupST(),
  ]);

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  loggers.cache.info({ succeeded, failed }, 'Cache warm-up completed');
}

async function warmupPRTG(): Promise<void> {
  const instances = await getSourceConfig('prtg');
  if (!instances.length) return;

  await Promise.allSettled(
    instances.map(async (instance) => {
      const client = getPRTGClient(instance);

      // Warm summary + alerts + sensors in parallel
      const [devicesResult, nonUpResult, allResult, alertsResult, sensorsResult] = await Promise.all([
        client.getDevices(),
        client.getNonUpSensors(),
        client.requestWithMeta<unknown[]>('/experimental/sensors', { limit: '1' }),
        client.getAlerts(),
        client.getSensors({}),
      ]);

      // Build summary (same logic as prtg/summary/route.ts)
      const totalSensors = allResult.totalCount || 0;
      const nonUpCount = nonUpResult.totalCount || nonUpResult.data.length;
      const upCount = totalSensors - nonUpCount;
      const statusCounts = { Down: 0, Acknowledged: 0, Warning: 0, Paused: 0, Unusual: 0 };
      for (const s of nonUpResult.data) {
        if (s.status in statusCounts) statusCounts[s.status as keyof typeof statusCounts]++;
      }
      const summary = {
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

      await Promise.all([
        cacheSet(`dashboard:prtg:${instance.id}:summary`, summary, CACHE_TTL.PRTG),
        cacheSet(`dashboard:prtg:${instance.id}:alerts`, alertsResult.data, CACHE_TTL.PRTG),
        cacheSet(`dashboard:prtg:${instance.id}:sensors`, sensorsResult.data, CACHE_TTL.PRTG),
      ]);

      loggers.prtg.debug({ instanceId: instance.id }, 'PRTG cache warmed');
    }),
  );
}

async function warmupVCenter(): Promise<void> {
  const instances = await getSourceConfig('vcenter');
  if (!instances.length) return;

  await Promise.allSettled(
    instances.map(async (instance) => {
      const client = getVCenterClient(instance);
      const [vms, hosts] = await Promise.all([client.getVMs(), client.getHosts()]);

      // Shared VM→Host mapping (same helper used by /vms and /hosts routes)
      const data = await getHostVMData(client, hosts);

      const enrichedVMs = vms.map((vm) => ({ ...vm, host: data.vmHostMap[vm.vm] ?? vm.host }));
      const enrichedHosts = hosts.map((host) => {
        const counts = data.hostCounts[host.host];
        return { ...host, vm_count: counts?.total ?? 0, running_vm_count: counts?.running ?? 0 };
      });

      await Promise.all([
        cacheSet(`dashboard:vcenter:${instance.id}:vms`, enrichedVMs, CACHE_TTL.VCENTER),
        cacheSet(`dashboard:vcenter:${instance.id}:hosts`, enrichedHosts, CACHE_TTL.VCENTER),
        cacheSet(`dashboard:vcenter:${instance.id}:vm-host-map`, data, CACHE_TTL.VCENTER),
      ]);

      loggers.vcenter.debug({ instanceId: instance.id }, 'vCenter cache warmed');
    }),
  );
}

async function warmupProxmox(): Promise<void> {
  const instances = await getSourceConfig('proxmox');
  if (!instances.length) return;

  await Promise.allSettled(
    instances.map(async (instance) => {
      const client = getProxmoxClient(instance);
      const vms = await client.getAllVMs();
      await cacheSet(`dashboard:proxmox:${instance.id}:vms`, vms, CACHE_TTL.PROXMOX);
      loggers.proxmox.debug({ instanceId: instance.id }, 'Proxmox cache warmed');
    }),
  );
}

async function warmupVeeam(): Promise<void> {
  const instances = await getSourceConfig('veeam');
  if (!instances.length) return;

  await Promise.allSettled(
    instances.map(async (instance) => {
      const client = getVeeamClient(instance);

      // Always warm VBEM summary
      const cacheOps: Promise<void>[] = [];
      const summary = await client.getSummary();
      cacheOps.push(cacheSet(`dashboard:veeam:${instance.id}:summary`, summary, CACHE_TTL.VEEAM));

      // Warm PS bridge data only if configured
      if (client.hasPsBridge) {
        const [sessions, jobs] = await Promise.all([client.getSessions(), client.getJobs()]);
        cacheOps.push(
          cacheSet(`dashboard:veeam:${instance.id}:sessions`, sessions, CACHE_TTL.VEEAM),
          cacheSet(`dashboard:veeam:${instance.id}:jobs`, jobs, CACHE_TTL.VEEAM),
        );
      }

      await Promise.all(cacheOps);
      loggers.veeam.debug({ instanceId: instance.id, hasPsBridge: client.hasPsBridge }, 'Veeam cache warmed');
    }),
  );
}

async function warmupGLPI(): Promise<void> {
  const instances = await getSourceConfig('glpi');
  if (!instances.length) return;

  await Promise.allSettled(
    instances.map(async (instance) => {
      const client = getGLPIClient(instance);
      const tickets = await client.getTickets();
      await cacheSet(`dashboard:glpi:${instance.id}:tickets`, tickets, CACHE_TTL.GLPI);
      loggers.glpi.debug({ instanceId: instance.id }, 'GLPI cache warmed');
    }),
  );
}

async function warmupST(): Promise<void> {
  const instances = await getSourceConfig('securetransport');
  if (!instances.length) return;

  await Promise.allSettled(
    instances.map(async (instance) => {
      const client = getSTClient(instance);
      const summary = await client.getSummary();
      await cacheSet(`dashboard:st:${instance.id}:summary`, summary, CACHE_TTL.ST);
      loggers.st.debug({ instanceId: instance.id }, 'ST cache warmed');
    }),
  );
}
