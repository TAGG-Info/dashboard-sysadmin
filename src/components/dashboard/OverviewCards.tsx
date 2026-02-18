'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  Server,
  Database,
  Ticket,
  ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { usePRTGAlerts } from '@/hooks/usePRTG';
import { useVCenterVMs, useProxmoxVMs } from '@/hooks/useInfrastructure';
import { useVeeamSessions } from '@/hooks/useVeeam';
import { useTicketSummary } from '@/hooks/useTickets';
import { useTransferSummary } from '@/hooks/useTransfers';

interface OverviewCardProps {
  title: string;
  icon: React.ReactNode;
  href: string;
  borderColor: string;
  children: React.ReactNode;
}

function OverviewCard({ title, icon, href, borderColor, children }: OverviewCardProps) {
  return (
    <Link href={href}>
      <Card
        className="transition-colors hover:bg-accent/50 cursor-pointer h-full"
        style={{ borderLeftWidth: '3px', borderLeftColor: borderColor }}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-muted-foreground">{icon}</div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </Link>
  );
}

function PlaceholderContent() {
  return (
    <div className="space-y-1">
      <p className="text-lg font-bold text-muted-foreground/50">Non configure</p>
      <StatusBadge status="neutral" label="Inactif" />
    </div>
  );
}

function InfrastructureContent() {
  const {
    data: vcenterVMs,
    loading: vcenterLoading,
    error: vcenterError,
    refresh: refreshVCenter,
  } = useVCenterVMs();
  const {
    data: proxmoxVMs,
    loading: proxmoxLoading,
    error: proxmoxError,
    refresh: refreshProxmox,
  } = useProxmoxVMs();

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
      <p className="text-lg font-bold text-foreground">
        {runningVMs} <span className="text-sm font-normal text-muted-foreground">running</span>
      </p>
      <div className="flex items-center gap-2">
        <StatusBadge
          status={runningVMs > 0 ? 'healthy' : 'neutral'}
          label={`${runningVMs}/${totalVMs} VMs`}
        />
        {vcenterError && !vcenterVMs && (
          <StatusBadge status="warning" label="VMware err" />
        )}
        {proxmoxError && !proxmoxVMs && (
          <StatusBadge status="warning" label="Proxmox err" />
        )}
      </div>
    </div>
  );
}

function BackupsContent() {
  const {
    data: sessions,
    loading,
    error,
    refresh,
  } = useVeeamSessions();

  const stats = useMemo(() => {
    if (!sessions) return null;

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentSessions = sessions.filter(
      (s) => new Date(s.creationTime) >= last24h
    );

    const failures = recentSessions.filter(
      (s) =>
        s.result.result.toLowerCase() === 'failed' ||
        s.result.result.toLowerCase() === 'error'
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
    return (
      <ErrorState
        title="Erreur Veeam"
        message={error.message}
        source="Veeam"
        onRetry={refresh}
      />
    );
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
          <p className="text-lg font-bold text-[#ef4444]">
            {stats.failures} echec(s)
          </p>
        ) : (
          <p className="text-lg font-bold text-[#10b981]">
            Tout OK
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={lastResultStatus} label={`Dernier: ${lastResultLabel}`} />
        {stats.failures > 0 && (
          <StatusBadge status="critical" label={`${stats.failures} fail 24h`} />
        )}
      </div>
    </div>
  );
}

function TicketsContent() {
  const {
    data: summary,
    loading,
    error,
    refresh,
  } = useTicketSummary();

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
      <ErrorState
        title="Erreur GLPI"
        message={error.message}
        source="GLPI"
        onRetry={refresh}
      />
    );
  }

  if (!summary) return <PlaceholderContent />;

  const overallStatus = (() => {
    if (summary.criticalCount > 0) return 'critical' as const;
    if (summary.openCount > 10) return 'warning' as const;
    return 'healthy' as const;
  })();

  return (
    <div className="space-y-1">
      <p className="text-lg font-bold text-foreground">
        {summary.openCount}{' '}
        <span className="text-sm font-normal text-muted-foreground">ouverts</span>
        {summary.criticalCount > 0 && (
          <span className="text-sm font-normal text-[#ef4444]">
            {' '}({summary.criticalCount} critiques)
          </span>
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
  const {
    data: summary,
    loading,
    error,
    refresh,
  } = useTransferSummary();

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
      <ErrorState
        title="Erreur SecureTransport"
        message={error.message}
        source="SecureTransport"
        onRetry={refresh}
      />
    );
  }

  if (!summary) return <PlaceholderContent />;

  const expiringSoonCount = summary.certificates.expiringSoon?.length ?? 0;

  return (
    <div className="space-y-1">
      <p className="text-lg font-bold text-foreground">
        {summary.accounts.active}{' '}
        <span className="text-sm font-normal text-muted-foreground">comptes actifs</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status={expiringSoonCount > 0 ? 'warning' : 'healthy'}
          label={
            expiringSoonCount > 0
              ? `${expiringSoonCount} cert(s) expirent bientot`
              : 'Tout OK'
          }
        />
      </div>
    </div>
  );
}

export function OverviewCards() {
  const { data: alerts, loading, error, refresh } = usePRTGAlerts();

  const downCount = alerts?.filter((s) => s.status === 'Down').length ?? 0;
  const warningCount = alerts?.filter((s) => s.status === 'Warning').length ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {/* PRTG Monitoring - FUNCTIONAL */}
      <OverviewCard
        title="Monitoring"
        icon={<Activity className="h-4 w-4" />}
        href="/monitoring"
        borderColor="#2196F3"
      >
        {loading && !alerts ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : error && !alerts ? (
          <ErrorState
            title="Erreur PRTG"
            message={error.message}
            source="PRTG"
            onRetry={refresh}
          />
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {downCount > 0 ? (
                <p className="text-lg font-bold text-[#ef4444]">
                  {downCount} down
                </p>
              ) : (
                <p className="text-lg font-bold text-[#10b981]">
                  Tout OK
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {downCount > 0 && <StatusBadge status="critical" label={`${downCount} down`} />}
              {warningCount > 0 && <StatusBadge status="warning" label={`${warningCount} warn`} />}
              {downCount === 0 && warningCount === 0 && (
                <StatusBadge status="healthy" label="Aucune alerte" />
              )}
            </div>
          </div>
        )}
      </OverviewCard>

      {/* Infrastructure - FUNCTIONAL */}
      <OverviewCard
        title="Infrastructure"
        icon={<Server className="h-4 w-4" />}
        href="/infrastructure"
        borderColor="#4CAF50"
      >
        <InfrastructureContent />
      </OverviewCard>

      {/* Backups - FUNCTIONAL */}
      <OverviewCard
        title="Backups"
        icon={<Database className="h-4 w-4" />}
        href="/backups"
        borderColor="#00B336"
      >
        <BackupsContent />
      </OverviewCard>

      {/* Tickets - FUNCTIONAL */}
      <OverviewCard
        title="Tickets"
        icon={<Ticket className="h-4 w-4" />}
        href="/tickets"
        borderColor="#FEC72D"
      >
        <TicketsContent />
      </OverviewCard>

      {/* Transferts - FUNCTIONAL */}
      <OverviewCard
        title="Transferts"
        icon={<ArrowUpDown className="h-4 w-4" />}
        href="/transfers"
        borderColor="#FF6D00"
      >
        <TransfersContent />
      </OverviewCard>
    </div>
  );
}
