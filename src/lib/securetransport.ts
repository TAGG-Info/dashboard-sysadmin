import type {
  STAccount,
  STCertificate,
  STTransferSite,
  STTransferSummary,
  STTransferLog,
  STTransferLogList,
} from '@/types/securetransport';
import type { STInstance } from '@/lib/config';
import { loggers } from '@/lib/logger';

export class SecureTransportClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private apiVersion: string;
  private useSitesEndpoint = false;

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
        Authorization: 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64'),
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      loggers.st.error({ status: res.status, path }, 'SecureTransport API error');
      throw new Error(`SecureTransport error: ${res.status}`);
    }
    return res.json();
  }

  async getAccounts(): Promise<STAccount[]> {
    const result = await this.request<{ result?: STAccount[] } | STAccount[]>(
      '/accounts?fields=name,businessUnit,type,disabled&limit=100',
    );
    return (result as { result?: STAccount[] }).result ?? (result as STAccount[]);
  }

  async getCertificates(): Promise<STCertificate[]> {
    const result = await this.request<{ result?: STCertificate[] } | STCertificate[]>('/certificates');
    return (result as { result?: STCertificate[] }).result ?? (result as STCertificate[]);
  }

  async getTransferSites(): Promise<STTransferSite[]> {
    const extract = (r: { result?: STTransferSite[] } | STTransferSite[]) =>
      (r as { result?: STTransferSite[] }).result ?? (r as STTransferSite[]);

    if (this.useSitesEndpoint) {
      return extract(await this.request<{ result?: STTransferSite[] } | STTransferSite[]>('/sites'));
    }
    try {
      return extract(await this.request<{ result?: STTransferSite[] } | STTransferSite[]>('/transferSites'));
    } catch {
      loggers.st.warn('transferSites endpoint unavailable, falling back to /sites');
      this.useSitesEndpoint = true;
      return extract(await this.request<{ result?: STTransferSite[] } | STTransferSite[]>('/sites'));
    }
  }

  /** Build ST API filter params from high-level filter object */
  private buildFilterParams(filters: {
    account?: string;
    status?: string;
    protocol?: string;
    incoming?: boolean;
    startDate?: number;
    endDate?: number;
    filename?: string;
  }): Record<string, string> {
    const p: Record<string, string> = {};
    // Wrap in wildcards for substring matching (ST API supports * natively).
    // Skip if the user already included a wildcard themselves.
    if (filters.account) p.account = filters.account.includes('*') ? filters.account : `*${filters.account}*`;
    if (filters.filename) p.filename = filters.filename.includes('*') ? filters.filename : `*${filters.filename}*`;
    if (filters.status) p.status = filters.status;
    if (filters.protocol) p.protocol = filters.protocol;
    if (filters.incoming !== undefined) p.incoming = String(filters.incoming);
    // ST API expects RFC2822: "EEE, d MMM yyyy HH:mm:ss Z"
    if (filters.startDate) p.startTimeAfter = new Date(filters.startDate).toUTCString();
    if (filters.endDate) p.endTimeBefore = new Date(filters.endDate).toUTCString();
    return p;
  }

  /** Lightweight count-only query — cache separately in the route to avoid double calls */
  async getTransferLogsCount(filters: Parameters<typeof this.buildFilterParams>[0] = {}): Promise<number> {
    const p = this.buildFilterParams(filters);
    const qs = new URLSearchParams({ limit: '1', offset: '0', ...p });
    const res = await this.request<{ resultSet: { totalCount: number } }>(`/logs/transfers?${qs.toString()}`);
    return res.resultSet.totalCount;
  }

  /**
   * Fetch transfer logs with reverse pagination (newest first).
   * Pass `knownTotalCount` (from a cached count) to skip the count query entirely.
   * offset = 0 → last N records, offset = 50 → second-to-last N, etc.
   */
  async getTransferLogs(
    limit = 50,
    offset = 0,
    filters: {
      account?: string;
      status?: string;
      protocol?: string;
      incoming?: boolean;
      startDate?: number; // ms epoch → RFC2822 startTimeAfter
      endDate?: number; // ms epoch → RFC2822 endTimeBefore
      filename?: string; // wildcard search supported natively
    } = {},
    knownTotalCount?: number, // skip count query if already cached
  ): Promise<STTransferLogList> {
    const filterParams = this.buildFilterParams(filters);

    const totalCount = knownTotalCount ?? (await this.getTransferLogsCount(filters));

    // Reverse pagination: ST returns oldest first, so we read from the tail
    const actualLimit = Math.min(limit, Math.max(0, totalCount - offset));
    if (actualLimit === 0) {
      return { resultSet: { returnCount: 0, totalCount }, transfers: [] };
    }
    const stOffset = Math.max(0, totalCount - limit - offset);
    const qs = new URLSearchParams({
      limit: String(actualLimit),
      offset: String(stOffset),
      ...filterParams,
    });
    const result = await this.request<{
      resultSet: { returnCount: number; totalCount: number };
      result: STTransferLog[];
    }>(`/logs/transfers?${qs.toString()}`);

    return {
      resultSet: { returnCount: result.resultSet.returnCount, totalCount },
      transfers: (result.result || []).reverse(), // newest first within the page
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
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
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
