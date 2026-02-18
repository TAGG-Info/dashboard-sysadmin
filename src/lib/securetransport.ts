import type {
  STAccount,
  STCertificate,
  STTransferSite,
  STTransferSummary,
  STTransferLog,
  STTransferLogList,
} from '@/types/securetransport';
import type { STInstance } from '@/lib/config';

export class SecureTransportClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private apiVersion: string;

  constructor(config: STInstance) {
    this.baseUrl = config.baseUrl;
    this.username = config.username;
    this.password = config.password;
    this.apiVersion = config.apiVersion || 'v2.0';
  }

  private get apiUrl() {
    return `${this.baseUrl}/api/${this.apiVersion}`;
  }

  async request<T>(path: string): Promise<T> {
    const res = await fetch(`${this.apiUrl}${path}`, {
      headers: {
        'Authorization':
          'Basic ' +
          Buffer.from(`${this.username}:${this.password}`).toString('base64'),
        'Accept': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`SecureTransport error: ${res.status}`);
    return res.json();
  }

  async getAccounts(): Promise<STAccount[]> {
    const result = await this.request<{ result?: STAccount[] }>(
      '/accounts?fields=name,businessUnit,type,disabled&limit=100'
    );
    return (result as { result?: STAccount[] }).result || (result as unknown as STAccount[]);
  }

  async getCertificates(): Promise<STCertificate[]> {
    const result = await this.request<{ result?: STCertificate[] }>(
      '/certificates'
    );
    return (result as { result?: STCertificate[] }).result || (result as unknown as STCertificate[]);
  }

  async getTransferSites(): Promise<STTransferSite[]> {
    try {
      const result = await this.request<{ result?: STTransferSite[] }>(
        '/transferSites'
      );
      return (result as { result?: STTransferSite[] }).result || (result as unknown as STTransferSite[]);
    } catch {
      // Fallback to /sites if transferSites not available
      const result = await this.request<{ result?: STTransferSite[] }>(
        '/sites'
      );
      return (result as { result?: STTransferSite[] }).result || (result as unknown as STTransferSite[]);
    }
  }

  async getTransferLogs(limit = 50, offset = 0): Promise<STTransferLogList> {
    const result = await this.request<{
      resultSet: { returnCount: number; totalCount: number };
      result: STTransferLog[];
    }>(`/logs/transfers?limit=${limit}&offset=${offset}`);
    return {
      resultSet: result.resultSet,
      transfers: result.result || [],
    };
  }

  // Transfer summary combining accounts + certificates
  async getSummary(): Promise<STTransferSummary> {
    const [accounts, certificates, sites] = await Promise.all([
      this.getAccounts().catch(() => [] as STAccount[]),
      this.getCertificates().catch(() => [] as STCertificate[]),
      this.getTransferSites().catch(() => [] as STTransferSite[]),
    ]);

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );
    const expiringSoon = certificates.filter((c) => {
      const expiry = new Date(c.notAfter);
      return expiry <= thirtyDaysFromNow && expiry > now;
    });

    return {
      accounts: {
        total: accounts.length,
        active: accounts.filter((a) => !a.disabled).length,
        disabled: accounts.filter((a) => a.disabled).length,
      },
      certificates: { total: certificates.length, expiringSoon },
      sites: { total: sites.length },
    };
  }
}

// Factory that caches clients by instanceId
const clientCache = new Map<string, SecureTransportClient>();

export function getSTClient(instance: STInstance): SecureTransportClient {
  const cached = clientCache.get(instance.id);
  if (cached) return cached;
  const client = new SecureTransportClient(instance);
  clientCache.set(instance.id, client);
  return client;
}
