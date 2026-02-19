import type { ProxmoxNode, ProxmoxVM, ProxmoxStorage } from '@/types/proxmox';
import type { ProxmoxInstance } from '@/lib/config';
import { loggers } from '@/lib/logger';

export class ProxmoxClient {
  private baseUrl: string;
  private tokenId: string;
  private tokenSecret: string;

  constructor(config: ProxmoxInstance) {
    this.baseUrl = config.baseUrl;
    this.tokenId = config.tokenId;
    this.tokenSecret = config.tokenSecret;
  }

  async request<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api2/json${path}`, {
      headers: {
        Authorization: `PVEAPIToken=${this.tokenId}=${this.tokenSecret}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      loggers.proxmox.error({ status: res.status, path }, 'Proxmox API error');
      throw new Error(`Proxmox error: ${res.status}`);
    }
    const json = await res.json();
    return json.data; // Proxmox wrappe toujours dans { data: ... }
  }

  async getNodes() {
    return this.request<ProxmoxNode[]>('/nodes');
  }

  async getVMs(node: string) {
    return this.request<ProxmoxVM[]>(`/nodes/${node}/qemu`);
  }

  async getContainers(node: string) {
    return this.request<ProxmoxVM[]>(`/nodes/${node}/lxc`);
  }

  async getStorage(node: string) {
    return this.request<ProxmoxStorage[]>(`/nodes/${node}/storage`);
  }

  // Methode qui recupere TOUTES les VMs et CTs de TOUS les nodes
  async getAllVMs(): Promise<ProxmoxVM[]> {
    const nodes = await this.getNodes();
    const results = await Promise.all(
      nodes
        .filter((node) => node.status === 'online')
        .map(async (node) => {
          const [vms, cts] = await Promise.all([
            this.getVMs(node.node).catch(() => [] as ProxmoxVM[]),
            this.getContainers(node.node).catch(() => [] as ProxmoxVM[]),
          ]);
          return [
            ...vms.map((vm) => ({ ...vm, type: 'qemu' as const, node: node.node })),
            ...cts.map((ct) => ({ ...ct, type: 'lxc' as const, node: node.node })),
          ];
        }),
    );
    return results.flat();
  }
}

// Factory that caches clients by instanceId
const clientCache = new Map<string, ProxmoxClient>();

export function getProxmoxClient(instance: ProxmoxInstance): ProxmoxClient {
  const cached = clientCache.get(instance.id);
  if (cached) return cached;
  const client = new ProxmoxClient(instance);
  clientCache.set(instance.id, client);
  return client;
}
