import type { VeeamJob, VeeamSession, VeeamRepository } from '@/types/veeam';
import type { VeeamInstance } from '@/lib/config';
import { loggers } from '@/lib/logger';

export class VeeamClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: VeeamInstance) {
    this.baseUrl = config.baseUrl;
    this.username = config.username;
    this.password = config.password;
  }

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) return this.accessToken;

    const res = await fetch(`${this.baseUrl}/api/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-version': '1.2-rev1',
      },
      body: `grant_type=password&username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}`,
    });
    if (!res.ok) {
      loggers.veeam.error({ status: res.status }, 'Veeam auth failed');
      throw new Error(`Veeam auth failed: ${res.status}`);
    }

    const data = await res.json();
    if (!data.access_token) {
      throw new Error('Veeam: access_token manquant dans la réponse OAuth');
    }
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in || 900) * 1000;
    return this.accessToken!;
  }

  async request<T>(path: string): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-api-version': '1.2-rev1',
      },
    });

    if (res.status === 401) {
      this.accessToken = null;
      const newToken = await this.getToken();
      const retry = await fetch(`${this.baseUrl}/api/v1${path}`, {
        headers: {
          Authorization: `Bearer ${newToken}`,
          'x-api-version': '1.2-rev1',
        },
      });
      if (!retry.ok) {
        loggers.veeam.error({ status: retry.status, path }, 'Veeam API error after re-auth');
        throw new Error(`Veeam error: ${retry.status}`);
      }
      return retry.json();
    }

    if (!res.ok) {
      loggers.veeam.error({ status: res.status, path }, 'Veeam API error');
      throw new Error(`Veeam error: ${res.status}`);
    }
    return res.json();
  }

  async getJobs() {
    const result = await this.request<{ data: VeeamJob[] }>('/jobs');
    return result.data || result;
  }

  async getSessions(limit = 50) {
    const result = await this.request<{ data: VeeamSession[] }>(
      `/sessions?typeFilter=Job&limit=${limit}&orderColumn=creationTime&orderAsc=false`,
    );
    return result.data || result;
  }

  async getSession(id: string) {
    return this.request<VeeamSession>(`/sessions/${id}`);
  }

  async getRepositories() {
    const result = await this.request<{ data: VeeamRepository[] }>('/backupInfrastructure/repositories');
    return result.data || result;
  }
}

// Factory that caches clients by instanceId (OAuth2 token-based, cache is critical)
const clientCache = new Map<string, VeeamClient>();

export function getVeeamClient(instance: VeeamInstance): VeeamClient {
  const cached = clientCache.get(instance.id);
  if (cached) return cached;
  const client = new VeeamClient(instance);
  clientCache.set(instance.id, client);
  return client;
}
