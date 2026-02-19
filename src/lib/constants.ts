export const CACHE_TTL = {
  PRTG: Number(process.env.CACHE_TTL_PRTG || 30) * 1000,
  VCENTER: Number(process.env.CACHE_TTL_VCENTER || 60) * 1000,
  PROXMOX: Number(process.env.CACHE_TTL_PROXMOX || 60) * 1000,
  VEEAM: Number(process.env.CACHE_TTL_VEEAM || 120) * 1000,
  GLPI: Number(process.env.CACHE_TTL_GLPI || 60) * 1000,
  ST: Number(process.env.CACHE_TTL_ST || 120) * 1000,
  ST_LOGS: Number(process.env.CACHE_TTL_ST_LOGS || 15) * 1000,
  ST_COUNT: Number(process.env.CACHE_TTL_ST_COUNT || 120) * 1000,
  STALE_MULTIPLIER: 5,
} as const;
