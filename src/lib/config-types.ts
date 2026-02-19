// ---------------------------------------------------------------------------
// Types – Base instance & per-source instance types
// ---------------------------------------------------------------------------

export interface BaseInstance {
  id: string; // unique slug, e.g. "vcenter-prod"
  name: string; // display name, e.g. "vCenter Production"
}

export interface PRTGInstance extends BaseInstance {
  baseUrl: string;
  apiKey: string;
  externalUrl: string;
}

export interface VCenterInstance extends BaseInstance {
  baseUrl: string;
  username: string;
  password: string;
  externalUrl: string;
}

export interface ProxmoxInstance extends BaseInstance {
  baseUrl: string;
  tokenId: string;
  tokenSecret: string;
  externalUrl: string;
}

export interface VeeamInstance extends BaseInstance {
  baseUrl: string;
  username: string;
  password: string;
  externalUrl: string;
  psBaseUrl?: string; // PowerShell HTTP bridge URL (e.g. http://TAGGSRVBAK02:9420)
}

export interface GLPIInstance extends BaseInstance {
  baseUrl: string;
  appToken: string;
  userToken: string;
  externalUrl: string;
}

export interface STInstance extends BaseInstance {
  baseUrl: string;
  username: string;
  password: string;
  apiVersion: string;
  externalUrl: string;
}

// New config structure: arrays instead of single objects
export interface SourceConfig {
  prtg?: PRTGInstance[];
  vcenter?: VCenterInstance[];
  proxmox?: ProxmoxInstance[];
  veeam?: VeeamInstance[];
  glpi?: GLPIInstance[];
  securetransport?: STInstance[];
}

// Old (legacy) config structure for migration detection
export interface LegacySourceConfig {
  prtg?: { baseUrl: string; apiKey: string; externalUrl: string };
  vcenter?: { baseUrl: string; username: string; password: string; externalUrl: string };
  proxmox?: { baseUrl: string; tokenId: string; tokenSecret: string; externalUrl: string };
  veeam?: { baseUrl: string; username: string; password: string; externalUrl: string };
  glpi?: { baseUrl: string; appToken: string; userToken: string; externalUrl: string };
  securetransport?: { baseUrl: string; username: string; password: string; apiVersion: string; externalUrl: string };
}

// Instance type map for getSourceConfig / getSourceInstance
export interface SourceInstanceMap {
  prtg: PRTGInstance;
  vcenter: VCenterInstance;
  proxmox: ProxmoxInstance;
  veeam: VeeamInstance;
  glpi: GLPIInstance;
  securetransport: STInstance;
}

export type SourceKey = keyof SourceConfig;

// Fields that must be encrypted on disk per source
export const SENSITIVE_FIELDS: Record<SourceKey, string[]> = {
  prtg: ['apiKey'],
  vcenter: ['password'],
  proxmox: ['tokenSecret'],
  veeam: ['password'],
  glpi: ['appToken', 'userToken'],
  securetransport: ['password'],
};
