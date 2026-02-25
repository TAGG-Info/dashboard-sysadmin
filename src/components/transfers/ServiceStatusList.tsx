'use client';

import { useSTServices } from '@/hooks/useTransfers';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { STDaemonStatusValue } from '@/types/securetransport';

const PROTOCOL_COLORS: Record<string, string> = {
  SSH: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  PESIT: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  FTP: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  HTTP: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  AS2: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
};

const PROTOCOL_LABELS: Record<string, string> = {
  ssh: 'SSH / SFTP',
  http: 'HTTPS',
  ftp: 'FTP',
  as2: 'AS2',
  pesit: 'PeSIT',
};

function daemonStatusToLevel(status: STDaemonStatusValue) {
  switch (status) {
    case 'Running':
      return 'healthy' as const;
    case 'Not running':
      return 'neutral' as const;
    case 'Shutdown':
    case 'Pending shutdown':
      return 'warning' as const;
  }
}

function daemonStatusLabel(status: STDaemonStatusValue) {
  switch (status) {
    case 'Running':
      return 'Actif';
    case 'Not running':
      return 'Arrêté';
    case 'Shutdown':
      return 'Arrêt';
    case 'Pending shutdown':
      return 'Arrêt en cours';
  }
}

export function ServiceStatusList() {
  const { data, loading, error } = useSTServices();

  if (loading && !data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-muted/30 h-10 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return <p className="text-muted-foreground text-sm">Impossible de charger les services</p>;
  }

  const services = data ?? [];

  return (
    <div className="space-y-1.5">
      {services.map((svc) => {
        const p = svc.protocol.toUpperCase();
        const protocolCls = PROTOCOL_COLORS[p] ?? 'bg-muted/30 text-muted-foreground border-border/50';

        return (
          <div
            key={`${svc._instanceId ?? 'default'}-${svc.protocol}`}
            className="border-border/40 bg-card/50 flex items-center justify-between rounded-lg border px-3 py-2"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-xs font-semibold ${protocolCls}`}
              >
                {p}
              </span>
              <span className="text-foreground text-sm">{PROTOCOL_LABELS[svc.protocol] ?? svc.serverName}</span>
              {svc._instanceName && <span className="text-muted-foreground text-xs">({svc._instanceName})</span>}
            </div>
            <StatusBadge status={daemonStatusToLevel(svc.daemonStatus)} label={daemonStatusLabel(svc.daemonStatus)} />
          </div>
        );
      })}
      {services.length === 0 && <p className="text-muted-foreground text-sm">Aucun service configuré</p>}
    </div>
  );
}
