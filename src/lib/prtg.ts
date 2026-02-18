import type { PRTGDevice, PRTGSensor, PRTGTimeseries } from '@/types/prtg';
import type { PRTGInstance } from '@/lib/config';

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
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`PRTG API v2 error: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async requestWithMeta<T>(path: string, params?: Record<string, string>): Promise<{
    data: T; totalCount: number; resultCount: number;
  }> {
    const url = new URL(`${this.baseUrl}/api/v2${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`PRTG API v2 error: ${res.status}`);
    return {
      data: await res.json() as T,
      totalCount: Number(res.headers.get('X-Total-Count') || 0),
      resultCount: Number(res.headers.get('X-Result-Count') || 0),
    };
  }

  // GET /experimental/devices
  async getDevices(): Promise<{ data: PRTGDevice[]; totalCount: number; resultCount: number }> {
    return this.requestWithMeta<PRTGDevice[]>('/experimental/devices', { include: 'metrics' });
  }

  // GET /experimental/sensors
  async getSensors(params?: { deviceId?: number; filter?: string }): Promise<{ data: PRTGSensor[]; totalCount: number; resultCount: number }> {
    const qp: Record<string, string> = {};
    if (params?.deviceId) qp.filter = `parentid = "${params.deviceId}"`;
    else if (params?.filter) qp.filter = params.filter;
    return this.requestWithMeta<PRTGSensor[]>('/experimental/sensors', qp);
  }

  // Sensors in alert state
  async getAlerts(): Promise<{ data: PRTGSensor[]; totalCount: number; resultCount: number }> {
    return this.requestWithMeta<PRTGSensor[]>('/experimental/sensors', {
      filter: 'status = "down" or status = "warning"',
      sort_by: '-priority',
    });
  }

  // GET /devices/{id}
  async getDevice(id: number): Promise<PRTGDevice> {
    return this.request<PRTGDevice>(`/devices/${id}`, { include: 'metrics,status' });
  }

  // GET /sensors/{id}
  async getSensor(id: number): Promise<PRTGSensor> {
    return this.request<PRTGSensor>(`/sensors/${id}`);
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
