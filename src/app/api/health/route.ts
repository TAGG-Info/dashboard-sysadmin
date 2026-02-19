import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSourceConfig } from '@/lib/config';
import { cacheGet, cacheSet, cacheGetStale } from '@/lib/cache';

export const dynamic = 'force-dynamic';

interface SourceHealth {
  source: string;
  instanceId: string;
  instanceName: string;
  status: 'connected' | 'error';
  latency: number;
  error?: string;
}

async function checkInstance(
  source: string,
  instanceId: string,
  instanceName: string,
  checkFn: () => Promise<void>,
): Promise<SourceHealth> {
  const start = Date.now();
  try {
    await checkFn();
    return { source, instanceId, instanceName, status: 'connected', latency: Date.now() - start };
  } catch (error) {
    return {
      source,
      instanceId,
      instanceName,
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Cache de 30s pour éviter de créer des sessions vCenter/GLPI à chaque requête
  const HEALTH_CACHE_KEY = 'dashboard:health';
  const cached = await cacheGet<{ sources: unknown[]; timestamp: number }>(HEALTH_CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Fetch all instances for all sources
  const [prtgInstances, vcenterInstances, proxmoxInstances, veeamInstances, glpiInstances, stInstances] =
    await Promise.all([
      getSourceConfig('prtg'),
      getSourceConfig('vcenter'),
      getSourceConfig('proxmox'),
      getSourceConfig('veeam'),
      getSourceConfig('glpi'),
      getSourceConfig('securetransport'),
    ]);

  const healthChecks: Promise<SourceHealth>[] = [];

  // PRTG instances
  for (const inst of prtgInstances) {
    healthChecks.push(
      checkInstance('prtg', inst.id, inst.name, async () => {
        const res = await fetch(`${inst.baseUrl}/api/v2/experimental/probes`, {
          headers: { Authorization: `Bearer ${inst.apiKey}` },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }),
    );
  }

  // vCenter instances
  for (const inst of vcenterInstances) {
    healthChecks.push(
      checkInstance('vcenter', inst.id, inst.name, async () => {
        const res = await fetch(`${inst.baseUrl}/api/session`, {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from(`${inst.username}:${inst.password}`).toString('base64'),
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const sessionId = await res.json();
        await fetch(`${inst.baseUrl}/api/session`, {
          method: 'DELETE',
          headers: { 'vmware-api-session-id': sessionId },
        }).catch(() => {});
      }),
    );
  }

  // Proxmox instances
  for (const inst of proxmoxInstances) {
    healthChecks.push(
      checkInstance('proxmox', inst.id, inst.name, async () => {
        const res = await fetch(`${inst.baseUrl}/api2/json/version`, {
          headers: { Authorization: `PVEAPIToken=${inst.tokenId}=${inst.tokenSecret}` },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }),
    );
  }

  // Veeam instances
  for (const inst of veeamInstances) {
    healthChecks.push(
      checkInstance('veeam', inst.id, inst.name, async () => {
        const res = await fetch(`${inst.baseUrl}/api/oauth2/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-api-version': '1.2-rev1' },
          body: `grant_type=password&username=${encodeURIComponent(inst.username)}&password=${encodeURIComponent(inst.password)}`,
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }),
    );
  }

  // GLPI instances
  for (const inst of glpiInstances) {
    healthChecks.push(
      checkInstance('glpi', inst.id, inst.name, async () => {
        const res = await fetch(`${inst.baseUrl}/initSession`, {
          headers: {
            'App-Token': inst.appToken,
            Authorization: `user_token ${inst.userToken}`,
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.session_token) {
          await fetch(`${inst.baseUrl}/killSession`, {
            headers: { 'App-Token': inst.appToken, 'Session-Token': data.session_token },
          }).catch(() => {});
        }
      }),
    );
  }

  // SecureTransport instances
  for (const inst of stInstances) {
    const version = inst.apiVersion || 'v2.0';
    healthChecks.push(
      checkInstance('securetransport', inst.id, inst.name, async () => {
        const res = await fetch(`${inst.baseUrl}/api/${version}/myself`, {
          headers: {
            Authorization: 'Basic ' + Buffer.from(`${inst.username}:${inst.password}`).toString('base64'),
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }),
    );
  }

  try {
    const checks = await Promise.allSettled(healthChecks);
    const results = checks.map((c) =>
      c.status === 'fulfilled'
        ? c.value
        : {
            source: 'unknown',
            instanceId: 'unknown',
            instanceName: 'Unknown',
            status: 'error' as const,
            latency: 0,
            error: 'Check failed',
          },
    );

    const responseData = { sources: results, timestamp: Date.now() };
    await cacheSet(HEALTH_CACHE_KEY, responseData, 30_000); // 30s
    return NextResponse.json(responseData);
  } catch {
    const stale = await cacheGetStale<{ sources: unknown[]; timestamp: number }>(HEALTH_CACHE_KEY);
    if (stale) return NextResponse.json(stale);
    return NextResponse.json({ error: 'Health check failed' }, { status: 503 });
  }
}
