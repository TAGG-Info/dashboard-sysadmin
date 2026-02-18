import type { VCenterVM, VCenterHost, VCenterDatastore, VCenterCluster } from '@/types/vcenter';
import type { VCenterInstance } from '@/lib/config';

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
        'Authorization': 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64'),
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`vCenter auth failed: ${res.status}`);

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
    });

    // Si 401, re-authenticate et retenter
    if (res.status === 401) {
      this.sessionId = null;
      const newSessionId = await this.getSession();
      const retry = await fetch(`${this.baseUrl}${path}`, {
        headers: { 'vmware-api-session-id': newSessionId },
      });
      if (!retry.ok) throw new Error(`vCenter error: ${retry.status}`);
      return retry.json();
    }

    if (!res.ok) throw new Error(`vCenter error: ${res.status}`);
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

// Factory that caches clients by instanceId (session-based, cache is critical)
const clientCache = new Map<string, VCenterClient>();

export function getVCenterClient(instance: VCenterInstance): VCenterClient {
  const cached = clientCache.get(instance.id);
  if (cached) return cached;
  const client = new VCenterClient(instance);
  clientCache.set(instance.id, client);
  return client;
}
