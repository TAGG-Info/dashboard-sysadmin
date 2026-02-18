export const CACHE_TTL = {
  PRTG: Number(process.env.CACHE_TTL_PRTG || 30) * 1000,
  VCENTER: Number(process.env.CACHE_TTL_VCENTER || 60) * 1000,
  PROXMOX: Number(process.env.CACHE_TTL_PROXMOX || 60) * 1000,
  VEEAM: Number(process.env.CACHE_TTL_VEEAM || 120) * 1000,
  GLPI: Number(process.env.CACHE_TTL_GLPI || 60) * 1000,
  ST: Number(process.env.CACHE_TTL_ST || 120) * 1000,
  STALE_MULTIPLIER: 5,
} as const;

export const ROUTES = {
  HOME: '/',
  MONITORING: '/monitoring',
  INFRASTRUCTURE: '/infrastructure',
  BACKUPS: '/backups',
  TICKETS: '/tickets',
  TRANSFERS: '/transfers',
  SETTINGS: '/settings',
} as const;

export const SOURCE_COLORS: Record<string, string> = {
  prtg: '#2196F3',
  vcenter: '#4CAF50',
  proxmox: '#E87D0D',
  veeam: '#00B336',
  glpi: '#FEC72D',
  securetransport: '#FF6D00',
};

export const STATUS_COLORS = {
  healthy: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
  info: '#3b82f6',
  neutral: '#6b7280',
  new: '#8b5cf6',
} as const;
