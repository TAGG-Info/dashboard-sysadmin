import type { VeeamJob, VeeamSession, VeeamSummary } from '@/types/veeam';
import type { VeeamInstance } from '@/lib/config';
import { loggers } from '@/lib/logger';

/**
 * Hybrid Veeam client — two backends:
 * - VBEM (Enterprise Manager, port 9398) → reports/summary, repos, stats
 * - PS Bridge (PowerShell HTTP bridge, port 9420) → individual jobs, sessions
 *
 * Auth:
 * - VBEM: session-based (POST /api/sessionMngr → X-RestSvcSessionId header)
 * - PS Bridge: Basic auth on every request (same credentials)
 */
export class VeeamClient {
  private emBaseUrl: string; // VBEM Enterprise Manager
  private psBaseUrl: string | null; // PowerShell bridge (optional)
  private username: string;
  private password: string;
  private sessionToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: VeeamInstance) {
    this.emBaseUrl = config.baseUrl;
    this.psBaseUrl = config.psBaseUrl || null;
    this.username = config.username;
    this.password = config.password;
  }

  // ─── VBEM Session Auth ──────────────────────────────────────────────

  private get basicAuth(): string {
    return Buffer.from(`${this.username}:${this.password}`).toString('base64');
  }

  private async getSession(): Promise<string> {
    if (this.sessionToken && Date.now() < this.tokenExpiry) return this.sessionToken;

    const res = await fetch(`${this.emBaseUrl}/api/sessionMngr/?v=latest`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${this.basicAuth}`,
      },
      body: '',
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      loggers.veeam.error({ status: res.status }, 'VBEM session auth failed');
      throw new Error(`VBEM auth failed: ${res.status}`);
    }

    // Token is in the response HEADER, not the JSON body
    const token = res.headers.get('X-RestSvcSessionId');
    if (!token) {
      throw new Error('VBEM: X-RestSvcSessionId header missing from response');
    }

    this.sessionToken = token;
    // VBEM session timeout is 15 min of inactivity; refresh at 12 min
    this.tokenExpiry = Date.now() + 12 * 60 * 1000;
    return this.sessionToken;
  }

  private async emRequest<T>(path: string): Promise<T> {
    const token = await this.getSession();
    const res = await fetch(`${this.emBaseUrl}${path}`, {
      headers: {
        'X-RestSvcSessionId': token,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401) {
      // Session expired — re-auth once
      this.sessionToken = null;
      const newToken = await this.getSession();
      const retry = await fetch(`${this.emBaseUrl}${path}`, {
        headers: {
          'X-RestSvcSessionId': newToken,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!retry.ok) {
        loggers.veeam.error({ status: retry.status, path }, 'VBEM API error after re-auth');
        throw new Error(`VBEM error: ${retry.status}`);
      }
      return retry.json();
    }

    if (!res.ok) {
      loggers.veeam.error({ status: res.status, path }, 'VBEM API error');
      throw new Error(`VBEM error: ${res.status}`);
    }
    return res.json();
  }

  // ─── VBEM Reports (summary) ─────────────────────────────────────────

  async getSummary(): Promise<VeeamSummary> {
    const [overview, jobStats, vmsOverview, processedVms, repositories] = await Promise.all([
      this.emRequest<VeeamSummary['overview']>('/api/reports/summary/overview'),
      this.emRequest<VeeamSummary['jobStats']>('/api/reports/summary/job_statistics'),
      this.emRequest<VeeamSummary['vmsOverview']>('/api/reports/summary/vms_overview'),
      this.emRequest<VeeamSummary['processedVms']>('/api/reports/summary/processed_vms'),
      this.emRequest<VeeamSummary['repositories']>('/api/reports/summary/repository'),
    ]);

    return { overview, jobStats, vmsOverview, processedVms, repositories };
  }

  // ─── PS Bridge (jobs/sessions) ──────────────────────────────────────

  private async psRequest<T>(path: string): Promise<T> {
    if (!this.psBaseUrl) {
      throw new Error('PS bridge URL not configured');
    }

    const res = await fetch(`${this.psBaseUrl}${path}`, {
      headers: {
        Authorization: `Basic ${this.basicAuth}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      loggers.veeam.error({ status: res.status, path }, 'PS bridge API error');
      throw new Error(`PS bridge error: ${res.status}`);
    }
    return res.json();
  }

  get hasPsBridge(): boolean {
    return !!this.psBaseUrl;
  }

  async getJobs(): Promise<VeeamJob[]> {
    if (!this.psBaseUrl) return [];
    return this.psRequest<VeeamJob[]>('/api/jobs');
  }

  async getSessions(limit = 50): Promise<VeeamSession[]> {
    if (!this.psBaseUrl) return [];
    return this.psRequest<VeeamSession[]>(`/api/sessions?limit=${limit}`);
  }
}

// Factory that caches clients by instanceId + config fingerprint
const clientCache = new Map<string, { client: VeeamClient; fingerprint: string }>();

function configFingerprint(instance: VeeamInstance): string {
  return `${instance.baseUrl}|${instance.username}|${instance.password}|${instance.psBaseUrl || ''}`;
}

export function getVeeamClient(instance: VeeamInstance): VeeamClient {
  const fp = configFingerprint(instance);
  const cached = clientCache.get(instance.id);
  if (cached && cached.fingerprint === fp) return cached.client;
  const client = new VeeamClient(instance);
  clientCache.set(instance.id, { client, fingerprint: fp });
  return client;
}
