'use client';

import { Timer } from 'lucide-react';

type SourceName = 'prtg' | 'vcenter' | 'proxmox' | 'veeam' | 'glpi' | 'securetransport';

interface RefreshConfig {
  key: SourceName;
  label: string;
  color: string;
  envVar: string;
  defaultMs: number;
}

const refreshConfigs: RefreshConfig[] = [
  { key: 'prtg', label: 'PRTG', color: '#2196F3', envVar: 'NEXT_PUBLIC_REFRESH_PRTG', defaultMs: 30000 },
  { key: 'vcenter', label: 'VMware', color: '#4CAF50', envVar: 'NEXT_PUBLIC_REFRESH_INFRA', defaultMs: 60000 },
  { key: 'proxmox', label: 'Proxmox', color: '#E87D0D', envVar: 'NEXT_PUBLIC_REFRESH_INFRA', defaultMs: 60000 },
  { key: 'veeam', label: 'Veeam', color: '#00B336', envVar: 'NEXT_PUBLIC_REFRESH_VEEAM', defaultMs: 120000 },
  { key: 'glpi', label: 'GLPI', color: '#FEC72D', envVar: 'NEXT_PUBLIC_REFRESH_TICKETS', defaultMs: 60000 },
  { key: 'securetransport', label: 'ST', color: '#FF6D00', envVar: 'NEXT_PUBLIC_REFRESH_TRANSFERS', defaultMs: 120000 },
];

function getIntervalSeconds(envVar: string, defaultMs: number): number {
  if (typeof window === 'undefined') return defaultMs / 1000;
  const envValues: Record<string, string | undefined> = {
    NEXT_PUBLIC_REFRESH_PRTG: process.env.NEXT_PUBLIC_REFRESH_PRTG,
    NEXT_PUBLIC_REFRESH_INFRA: process.env.NEXT_PUBLIC_REFRESH_INFRA,
    NEXT_PUBLIC_REFRESH_VEEAM: process.env.NEXT_PUBLIC_REFRESH_VEEAM,
    NEXT_PUBLIC_REFRESH_TICKETS: process.env.NEXT_PUBLIC_REFRESH_TICKETS,
    NEXT_PUBLIC_REFRESH_TRANSFERS: process.env.NEXT_PUBLIC_REFRESH_TRANSFERS,
  };
  const val = envValues[envVar];
  return val ? Number(val) / 1000 : defaultMs / 1000;
}

function formatInterval(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes} min`;
  }
  return `${seconds}s`;
}

export function RefreshSettings() {
  const intervals = refreshConfigs.map((c) => getIntervalSeconds(c.envVar, c.defaultMs));
  const maxInterval = Math.max(...intervals);

  return (
    <div className="settings-card-glow rounded-xl bg-background border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 border border-primary/20">
            <Timer className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wide">Intervalles de refresh</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Via <code className="text-sm font-mono text-muted-foreground/80 bg-white/5 px-1 rounded">NEXT_PUBLIC_REFRESH_*</code>
            </p>
          </div>
        </div>
      </div>

      {/* Bars */}
      <div className="px-5 py-4 space-y-3 stagger-in">
        {refreshConfigs.map((config, i) => {
          const seconds = intervals[i];
          const barWidth = maxInterval > 0 ? (seconds / maxInterval) * 100 : 0;

          return (
            <div key={config.key} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-sm font-medium text-foreground">{config.label}</span>
                </div>
                <span className="text-sm font-mono font-semibold text-muted-foreground tabular-nums">
                  {formatInterval(seconds)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${barWidth}%`,
                    background: `linear-gradient(90deg, ${config.color}60, ${config.color})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
