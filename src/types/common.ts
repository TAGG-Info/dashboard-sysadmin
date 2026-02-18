export type SourceName = 'prtg' | 'vcenter' | 'proxmox' | 'veeam' | 'glpi' | 'securetransport';

export type StatusLevel = 'healthy' | 'warning' | 'critical' | 'info' | 'neutral' | 'new';

/** Metadata added to every data item when aggregated from multiple instances */
export interface InstanceMetadata {
  _instanceId: string;
  _instanceName: string;
}

/** Helper type to add instance metadata to any data type */
export type WithInstance<T> = T & InstanceMetadata;

export interface ApiResponse<T> {
  data: T;
  _stale?: boolean;
  _source: SourceName;
  _timestamp: number;
  _partial?: boolean;
  _instanceId?: string;
  _instanceName?: string;
}

export interface ApiError {
  error: string;
  source: SourceName;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface HealthStatus {
  source: SourceName;
  status: 'connected' | 'error';
  latency?: number;
  version?: string;
  error?: string;
}

/** Configuration for a single source instance (as returned by GET /api/settings/sources) */
export interface SourceInstanceConfig {
  id: string;
  name: string;
  [key: string]: string;
}

/** Structure returned by GET /api/settings/sources */
export interface SourcesConfig {
  config: Record<string, SourceInstanceConfig[]>;
}
