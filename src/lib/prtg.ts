import type { PRTGDevice, PRTGSensor, PRTGStatus, PRTGTimeseries } from '@/types/prtg';
import type { PRTGInstance } from '@/lib/config';
import { loggers } from '@/lib/logger';

// PRTG API v2 status enum values → dashboard normalized format
// Ref: /api/v2/overview/#toc_29
const STATUS_MAP: Record<string, PRTGStatus> = {
  up: 'Up',
  down: 'Down',
  partialdown: 'Down',
  acknowledged: 'Acknowledged',
  warning: 'Warning',
  unusual: 'Unusual',
  pausedbyuser: 'Paused',
  pausedbydependency: 'Paused',
  pausedbyschedule: 'Paused',
  pausedbylicense: 'Paused',
  pausedbyuseruntil: 'Paused',
  paused: 'Paused', // fallback
  unknown: 'Unknown',
};

function normalizeStatus(raw: string): PRTGStatus {
  // API returns UPPER_SNAKE_CASE (e.g. PAUSED_BY_USER_UNTIL) — strip underscores + lowercase
  const key = raw?.toLowerCase().replace(/_/g, '');
  return STATUS_MAP[key] ?? 'Unknown';
}

export class PRTGClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: PRTGInstance) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v2${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      loggers.prtg.error({ status: res.status, path }, 'PRTG API error');
      throw new Error(`PRTG API v2 error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  async requestWithMeta<T>(
    path: string,
    params?: Record<string, string>,
  ): Promise<{
    data: T;
    totalCount: number;
    resultCount: number;
  }> {
    const url = new URL(`${this.baseUrl}/api/v2${path}`);
    // PRTG API v2 pagination: use `limit` param, max 3000 (default ~100)
    url.searchParams.set('limit', '3000');
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      loggers.prtg.error({ status: res.status, path }, 'PRTG API error');
      throw new Error(`PRTG API v2 error: ${res.status}`);
    }
    return {
      data: (await res.json()) as T,
      totalCount: Number(res.headers.get('X-Total-Count') || 0),
      resultCount: Number(res.headers.get('X-Result-Count') || 0),
    };
  }

  // GET /experimental/devices
  async getDevices(): Promise<{ data: PRTGDevice[]; totalCount: number; resultCount: number }> {
    const r = await this.requestWithMeta<PRTGDevice[]>('/experimental/devices');
    r.data = r.data.map((d) => ({ ...d, status: normalizeStatus(d.status) }));
    return r;
  }

  // GET /experimental/sensors
  async getSensors(params?: {
    deviceId?: number;
    filter?: string;
  }): Promise<{ data: PRTGSensor[]; totalCount: number; resultCount: number }> {
    const qp: Record<string, string> = {};
    if (params?.deviceId) qp.filter = `parentid = ${params.deviceId}`;
    else if (params?.filter) qp.filter = params.filter;
    // No default filter — PRTG API v2 returns "up" sensors by default
    const r = await this.requestWithMeta<PRTGSensor[]>('/experimental/sensors', qp);
    r.data = r.data.map((s) => ({ ...s, status: normalizeStatus(s.status) }));
    return r;
  }

  // Sensors in alert state (down, acknowledged, partialdown, warning)
  async getAlerts(): Promise<{ data: PRTGSensor[]; totalCount: number; resultCount: number }> {
    const r = await this.requestWithMeta<PRTGSensor[]>('/experimental/sensors', {
      filter: 'status = down or status = acknowledged or status = warning or status = partialdown',
      sort_by: '-priority',
    });
    r.data = r.data.map((s) => ({ ...s, status: normalizeStatus(s.status) }));
    return r;
  }

  // All non-up sensors in one call using not() filter
  async getNonUpSensors(): Promise<{ data: PRTGSensor[]; totalCount: number; resultCount: number }> {
    const r = await this.requestWithMeta<PRTGSensor[]>('/experimental/sensors', {
      filter: 'not(status = up)',
    });
    r.data = r.data.map((s) => ({ ...s, status: normalizeStatus(s.status) }));
    return r;
  }

  // GET /devices/{id}
  async getDevice(id: number): Promise<PRTGDevice> {
    const d = await this.request<PRTGDevice>(`/devices/${id}`);
    return { ...d, status: normalizeStatus(d.status) };
  }

  // GET /sensors/{id}
  async getSensor(id: number): Promise<PRTGSensor> {
    const s = await this.request<PRTGSensor>(`/sensors/${id}`);
    return { ...s, status: normalizeStatus(s.status) };
  }

  // GET /experimental/timeseries/{sensorId}/{type}
  async getTimeseries(sensorId: number, type: string = 'last48hours'): Promise<PRTGTimeseries> {
    return this.request<PRTGTimeseries>(`/experimental/timeseries/${sensorId}/${type}`);
  }
}

// Factory that caches clients by instanceId
const clientCache = new Map<string, PRTGClient>();

export function getPRTGClient(instance: PRTGInstance): PRTGClient {
  const cached = clientCache.get(instance.id);
  if (cached) return cached;
  const client = new PRTGClient(instance);
  clientCache.set(instance.id, client);
  return client;
}
