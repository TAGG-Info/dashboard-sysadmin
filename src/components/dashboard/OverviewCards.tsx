'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SourceLogo } from '@/components/ui/SourceLogo';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { useVCenterVMs, useProxmoxVMs } from '@/hooks/useInfrastructure';
import { useTicketSummary } from '@/hooks/useTickets';
import { useTransferSummary } from '@/hooks/useTransfers';
import type { UseAutoRefreshReturn } from '@/hooks/useAutoRefresh';
import type { PRTGSensorWithInstance } from '@/hooks/usePRTG';
import type { VeeamSessionWithInstance } from '@/hooks/useVeeam';

interface OverviewCardProps {
  title: string;
  icon: React.ReactNode;
  href: string;
  accentColor: string;
  children: React.ReactNode;
}

const SPARKLINE_DATA: Record<string, number[]> = {
  '#f99e1c': [20, 18, 22, 14, 16, 10, 12, 8, 5],
  '#879AC3': [14, 12, 16, 10, 8, 12, 10, 8, 10],
  '#4caf50': [10, 8, 12, 6, 18, 8, 6, 10, 8],
  '#00a5f3': [16, 14, 18, 12, 20, 16, 14, 18, 12],
  '#D9272D': [18, 14, 16, 10, 12, 8, 14, 10, 8],
};

function Sparkline({ color }: { color: string }) {
  const points = SPARKLINE_DATA[color] ?? [14, 12, 16, 10, 8, 12, 10, 8, 10];
  const step = 120 / (points.length - 1);
  const linePoints = points.map((y, i) => `${i * step},${y}`).join(' ');
  const areaPoints = `0,28 ${linePoints} 120,28`;
  const gradientId = `spark-${color.replace('#', '')}`;

  return (
    <div className="mt-2 h-[28px] opacity-80">
      <svg viewBox="0 0 120 28" className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polyline fill={`url(#${gradientId})`} stroke="none" points={areaPoints} />
        <polyline fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" points={linePoints} />
      </svg>
    </div>
  );
}

function OverviewCard({ title, icon, href, accentColor, children }: OverviewCardProps) {
  return (
    <Link href={href}>
      <Card className="group relative h-full cursor-pointer overflow-hidden transition-all duration-200 hover:bg-white/[0.03]">
        <div
          className="absolute top-0 bottom-0 left-0 w-[3px] rounded-l-xl"
          style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}30)` }}
        />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</CardTitle>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md opacity-80 transition-opacity group-hover:opacity-100"
            style={{ color: accentColor, backgroundColor: `${accentColor}15` }}
          >
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          {children}
          <Sparkline color={accentColor} />
        </CardContent>
      </Card>
    </Link>
  );
}

function PlaceholderContent() {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground/50 text-2xl font-bold">Non configure</p>
      <StatusBadge status="neutral" label="Inactif" />
    </div>
  );
}

function InfrastructureContent() {
  const { data: vcenterVMs, loading: vcenterLoading, error: vcenterError, refresh: refreshVCenter } = useVCenterVMs();
  const { data: proxmoxVMs, loading: proxmoxLoading, error: proxmoxError, refresh: refreshProxmox } = useProxmoxVMs();

  const loading = (vcenterLoading && !vcenterVMs) || (proxmoxLoading && !proxmoxVMs);
  const hasError = vcenterError && proxmoxError && !vcenterVMs && !proxmoxVMs;

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (hasError) {
    return (
      <ErrorState
        title="Erreur Infrastructure"
        message="VMware et Proxmox injoignables"
        source="VMware / Proxmox"
        onRetry={() => {
          refreshVCenter();
          refreshProxmox();
        }}
      />
    );
  }

  const allVMs = [
    ...(vcenterVMs ?? []).map((vm) => ({
      running: vm.power_state === 'POWERED_ON',
    })),
    ...(proxmoxVMs ?? []).map((vm) => ({
      running: vm.status === 'running',
    })),
  ];

  const totalVMs = allVMs.length;
  const runningVMs = allVMs.filter((vm) => vm.running).length;

  return (
    <div className="space-y-1">
      <p className="text-foreground text-2xl font-bold">
        {runningVMs} <span className="text-muted-foreground text-sm font-normal">running</span>
      </p>
      <div className="flex items-center gap-2">
        <StatusBadge status={runningVMs > 0 ? 'healthy' : 'neutral'} label={`${runningVMs}/${totalVMs} VMs`} />
        {vcenterError && !vcenterVMs && <StatusBadge status="warning" label="VMware err" />}
        {proxmoxError && !proxmoxVMs && <StatusBadge status="warning" label="Proxmox err" />}
      </div>
    </div>
  );
}

function BackupsContent({ veeamSessions }: { veeamSessions: UseAutoRefreshReturn<VeeamSessionWithInstance[]> }) {
  const { data: sessions, loading, error, refresh } = veeamSessions;

  const stats = useMemo(() => {
    if (!sessions) return null;

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentSessions = sessions.filter((s) => new Date(s.creationTime) >= last24h);

    const failures = recentSessions.filter(
      (s) => s.result.result.toLowerCase() === 'failed' || s.result.result.toLowerCase() === 'error',
    ).length;

    // Find last completed session
    const lastCompleted = [...sessions]
      .filter((s) => s.endTime)
      .sort((a, b) => new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime())[0];

    return {
      failures,
      lastResult: lastCompleted?.result.result,
    };
  }, [sessions]);

  if (loading && !sessions) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (error && !sessions) {
    return <ErrorState title="Erreur Veeam" message={error.message} source="Veeam" onRetry={refresh} />;
  }

  if (!stats) return <PlaceholderContent />;

  const lastResultStatus = (() => {
    switch (stats.lastResult?.toLowerCase()) {
      case 'success':
        return 'healthy' as const;
      case 'warning':
        return 'warning' as const;
      case 'failed':
      case 'error':
        return 'critical' as const;
      default:
        return 'neutral' as const;
    }
  })();

  const lastResultLabel = (() => {
    switch (stats.lastResult?.toLowerCase()) {
      case 'success':
        return 'Success';
      case 'warning':
        return 'Warning';
      case 'failed':
        return 'Failed';
      default:
        return stats.lastResult || 'N/A';
    }
  })();

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {stats.failures > 0 ? (
          <p className="text-2xl font-bold text-[#ef4444]">{stats.failures} echec(s)</p>
        ) : (
          <p className="text-2xl font-bold text-[#22c55e]">Tout OK</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={lastResultStatus} label={`Dernier: ${lastResultLabel}`} />
        {stats.failures > 0 && <StatusBadge status="critical" label={`${stats.failures} fail 24h`} />}
      </div>
    </div>
  );
}

function TicketsContent() {
  const { data: summary, loading, error, refresh } = useTicketSummary();

  if (loading && !summary) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (error && !summary) {
    return <ErrorState title="Erreur GLPI" message={error.message} source="GLPI" onRetry={refresh} />;
  }

  if (!summary) return <PlaceholderContent />;

  const overallStatus = (() => {
    if (summary.criticalCount > 0) return 'critical' as const;
    if (summary.openCount > 10) return 'warning' as const;
    return 'healthy' as const;
  })();

  return (
    <div className="space-y-1">
      <p className="text-foreground text-2xl font-bold">
        {summary.openCount} <span className="text-muted-foreground text-sm font-normal">ouverts</span>
        {summary.criticalCount > 0 && (
          <span className="text-sm font-normal text-[#ef4444]"> ({summary.criticalCount} critiques)</span>
        )}
      </p>
      <div className="flex items-center gap-2">
        <StatusBadge
          status={overallStatus}
          label={
            overallStatus === 'critical'
              ? `${summary.criticalCount} critiques`
              : overallStatus === 'warning'
                ? `${summary.openCount} ouverts`
                : 'Sous controle'
          }
        />
      </div>
    </div>
  );
}

function TransfersContent() {
  const { data: summary, loading, error, refresh } = useTransferSummary();

  if (loading && !summary) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <ErrorState title="Erreur SecureTransport" message={error.message} source="SecureTransport" onRetry={refresh} />
    );
  }

  if (!summary) return <PlaceholderContent />;

  const expiringSoonCount = summary.certificates.expiringSoon?.length ?? 0;

  return (
    <div className="space-y-1">
      <p className="text-foreground text-2xl font-bold">
        {summary.accounts.active} <span className="text-muted-foreground text-sm font-normal">comptes actifs</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status={expiringSoonCount > 0 ? 'warning' : 'healthy'}
          label={expiringSoonCount > 0 ? `${expiringSoonCount} cert(s) expirent bientot` : 'Tout OK'}
        />
      </div>
    </div>
  );
}

interface OverviewCardsProps {
  prtgAlerts: UseAutoRefreshReturn<PRTGSensorWithInstance[]>;
  veeamSessions: UseAutoRefreshReturn<VeeamSessionWithInstance[]>;
}

export function OverviewCards({ prtgAlerts, veeamSessions }: OverviewCardsProps) {
  const { data: alerts, loading, error, refresh } = prtgAlerts;

  const downCount = alerts?.filter((s) => s.status === 'Down').length ?? 0;
  const warningCount = alerts?.filter((s) => s.status === 'Warning').length ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:gap-5">
      {/* PRTG Monitoring */}
      <OverviewCard
        title="Monitoring"
        icon={<SourceLogo source="prtg" size={20} />}
        href="/monitoring"
        accentColor="#f99e1c"
      >
        {loading && !alerts ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : error && !alerts ? (
          <ErrorState title="Erreur PRTG" message={error.message} source="PRTG" onRetry={refresh} />
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {downCount > 0 ? (
                <p className="text-2xl font-bold text-[#ef4444]">{downCount} down</p>
              ) : (
                <p className="text-2xl font-bold text-[#22c55e]">Tout OK</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {downCount > 0 && <StatusBadge status="critical" label={`${downCount} down`} />}
              {warningCount > 0 && <StatusBadge status="warning" label={`${warningCount} warn`} />}
              {downCount === 0 && warningCount === 0 && <StatusBadge status="healthy" label="Aucune alerte" />}
            </div>
          </div>
        )}
      </OverviewCard>

      {/* Infrastructure */}
      <OverviewCard
        title="Infrastructure"
        icon={<SourceLogo source="vcenter" size={20} />}
        href="/infrastructure"
        accentColor="#879AC3"
      >
        <InfrastructureContent />
      </OverviewCard>

      {/* Backups */}
      <OverviewCard
        title="Backups"
        icon={<SourceLogo source="veeam" size={20} />}
        href="/backups"
        accentColor="#4caf50"
      >
        <BackupsContent veeamSessions={veeamSessions} />
      </OverviewCard>

      {/* Tickets */}
      <OverviewCard title="Tickets" icon={<SourceLogo source="glpi" size={20} />} href="/tickets" accentColor="#00a5f3">
        <TicketsContent />
      </OverviewCard>

      {/* Transferts */}
      <OverviewCard
        title="Transferts"
        icon={<SourceLogo source="securetransport" size={20} />}
        href="/transfers"
        accentColor="#D9272D"
      >
        <TransfersContent />
      </OverviewCard>
    </div>
  );
}
