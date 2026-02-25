import type { VCenterVM, VCenterHost, VCenterDatastore, VCenterCluster } from '@/types/vcenter';
import type { VCenterInstance } from '@/lib/config';
import { loggers } from '@/lib/logger';

export class VCenterClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private sessionId: string | null = null;
  private sessionExpiry: number = 0;

  constructor(config: VCenterInstance) {
    this.baseUrl = config.baseUrl;
    this.username = config.username;
    this.password = config.password;
  }

  private async getSession(): Promise<string> {
    // Si session valide (< 25 min), la reutiliser
    if (this.sessionId && Date.now() < this.sessionExpiry) return this.sessionId;

    // POST /api/session avec Basic Auth
    const res = await fetch(`${this.baseUrl}/api/session`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      loggers.vcenter.error({ status: res.status }, 'vCenter auth failed');
      throw new Error(`vCenter auth failed: ${res.status}`);
    }

    // La reponse est un string JSON (le session ID)
    const sessionId = await res.json();
    this.sessionId = sessionId;
    this.sessionExpiry = Date.now() + 25 * 60 * 1000; // 25 min (expire at 30)
    return sessionId;
  }

  async request<T>(path: string): Promise<T> {
    const sessionId = await this.getSession();
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'vmware-api-session-id': sessionId },
      signal: AbortSignal.timeout(10_000),
    });

    // Si 401, re-authenticate et retenter
    if (res.status === 401) {
      this.sessionId = null;
      const newSessionId = await this.getSession();
      const retry = await fetch(`${this.baseUrl}${path}`, {
        headers: { 'vmware-api-session-id': newSessionId },
        signal: AbortSignal.timeout(10_000),
      });
      if (!retry.ok) {
        loggers.vcenter.error({ status: retry.status, path }, 'vCenter API error after re-auth');
        throw new Error(`vCenter error: ${retry.status}`);
      }
      return retry.json();
    }

    if (!res.ok) {
      loggers.vcenter.error({ status: res.status, path }, 'vCenter API error');
      throw new Error(`vCenter error: ${res.status}`);
    }
    return res.json();
  }

  // GET /api/vcenter/vm
  async getVMs() {
    return this.request<VCenterVM[]>('/api/vcenter/vm');
  }

  // GET /api/vcenter/vm?hosts={hostId} — filter VMs by host
  async getVMsByHost(hostId: string) {
    return this.request<VCenterVM[]>(`/api/vcenter/vm?hosts=${hostId}`);
  }

  // GET /api/vcenter/host
  async getHosts() {
    return this.request<VCenterHost[]>('/api/vcenter/host');
  }

  // GET /api/vcenter/datastore
  async getDatastores() {
    return this.request<VCenterDatastore[]>('/api/vcenter/datastore');
  }

  // GET /api/vcenter/cluster
  async getClusters() {
    return this.request<VCenterCluster[]>('/api/vcenter/cluster');
  }
}

/**
 * Returns per-host VM data: vmId→hostId mapping + per-host VM counts.
 * Shared by both /api/vcenter/vms and /api/vcenter/hosts routes.
 */
export interface HostVMData {
  vmHostMap: Record<string, string>;
  hostCounts: Record<string, { total: number; running: number }>;
}

export async function getHostVMData(client: VCenterClient, hosts: VCenterHost[]): Promise<HostVMData> {
  // Fetch all VMs once instead of N+1 per-host calls
  const allVMs = await client.getVMs().catch(() => [] as VCenterVM[]);

  const vmHostMap: Record<string, string> = {};
  const hostCounts: Record<string, { total: number; running: number }> = {};

  // Initialize counts for all hosts
  for (const host of hosts) {
    hostCounts[host.host] = { total: 0, running: 0 };
  }

  // Build mapping from VM host field
  for (const vm of allVMs) {
    if (vm.host) {
      vmHostMap[vm.vm] = vm.host;
      if (hostCounts[vm.host]) {
        hostCounts[vm.host].total += 1;
        if (vm.power_state === 'POWERED_ON') {
          hostCounts[vm.host].running += 1;
        }
      }
    }
  }

  return { vmHostMap, hostCounts };
}

// Factory that caches clients by instanceId (session-based, cache is critical)
const clientCache = new Map<string, VCenterClient>();

export function getVCenterClient(instance: VCenterInstance): VCenterClient {
  const cached = clientCache.get(instance.id);
  if (cached) return cached;
  const client = new VCenterClient(instance);
  clientCache.set(instance.id, client);
  return client;
}
