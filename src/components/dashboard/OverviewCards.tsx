'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SourceLogo } from '@/components/ui/SourceLogo';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { useVCenterVMs, useProxmoxVMs } from '@/hooks/useInfrastructure';
import { useTicketSummary } from '@/hooks/useTickets';
import { useTransferSummary } from '@/hooks/useTransfers';
import type { UseAutoRefreshReturn } from '@/hooks/useAutoRefresh';
import type { PRTGSensorWithInstance } from '@/hooks/usePRTG';
import type { VeeamSummary } from '@/types/veeam';

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
    <div>
      <p className="text-muted-foreground/30 text-3xl font-extrabold tracking-tight">—</p>
      <p className="text-muted-foreground mt-1 text-xs">non configure</p>
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

  const hostCount =
    (vcenterVMs ? new Set(vcenterVMs.map((vm) => vm.host)).size : 0) +
    (proxmoxVMs ? new Set(proxmoxVMs.map((vm) => vm.node)).size : 0);

  return (
    <div>
      <p className="text-foreground text-3xl font-extrabold tracking-tight">{runningVMs}</p>
      <p className="text-muted-foreground mt-1 text-xs">VMs en fonctionnement</p>
      <p className="mt-1.5 text-xs font-semibold">
        <span className="text-muted-foreground">
          {hostCount > 0 ? `${hostCount} hosts` : ''}
          {hostCount > 0 && totalVMs > 0 ? ' · ' : ''}
          {totalVMs} total
        </span>
        {vcenterError && !vcenterVMs && <span className="text-yellow-400"> · VMware err</span>}
        {proxmoxError && !proxmoxVMs && <span className="text-yellow-400"> · Proxmox err</span>}
      </p>
    </div>
  );
}

function BackupsContent({ veeamSummary }: { veeamSummary: UseAutoRefreshReturn<VeeamSummary> }) {
  const { data: summary, loading, error, refresh } = veeamSummary;

  if (loading && !summary) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (error && !summary) {
    return <ErrorState title="Erreur Veeam" message={error.message} source="Veeam" onRetry={refresh} />;
  }

  if (!summary) return <PlaceholderContent />;

  const { SuccessfulJobRuns, FailedJobRuns, WarningsJobRuns } = summary.jobStats;

  return (
    <div>
      <p className="text-foreground text-3xl font-extrabold tracking-tight">{SuccessfulJobRuns}</p>
      <p className="text-muted-foreground mt-1 text-xs">succes</p>
      <p className="mt-1.5 text-xs font-semibold">
        {FailedJobRuns > 0 || WarningsJobRuns > 0 ? (
          <>
            {FailedJobRuns > 0 && <span className="text-red-400">{FailedJobRuns} echec(s)</span>}
            {FailedJobRuns > 0 && WarningsJobRuns > 0 && <span className="text-muted-foreground"> · </span>}
            {WarningsJobRuns > 0 && <span className="text-yellow-400">{WarningsJobRuns} warning</span>}
          </>
        ) : (
          <span className="text-emerald-400">Tout OK</span>
        )}
      </p>
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

  const newCount = summary.byStatus?.[1] ?? 0;

  return (
    <div>
      <p className="text-foreground text-3xl font-extrabold tracking-tight">{summary.openCount}</p>
      <p className="text-muted-foreground mt-1 text-xs">tickets ouverts</p>
      <p className="mt-1.5 text-xs font-semibold">
        {summary.criticalCount > 0 && (
          <span className="text-red-400">
            {summary.criticalCount} critique{summary.criticalCount > 1 ? 's' : ''}
          </span>
        )}
        {summary.criticalCount > 0 && newCount > 0 && <span className="text-muted-foreground"> · </span>}
        {newCount > 0 && <span className="text-blue-400">{newCount} nouveaux</span>}
        {summary.criticalCount === 0 && newCount === 0 && <span className="text-emerald-400">Sous controle</span>}
      </p>
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

  const siteCount = summary.accounts.total ?? 0;

  return (
    <div>
      <p className="text-foreground text-3xl font-extrabold tracking-tight">{summary.accounts.active}</p>
      <p className="text-muted-foreground mt-1 text-xs">comptes actifs</p>
      <p className="mt-1.5 text-xs font-semibold">
        {expiringSoonCount > 0 && (
          <span className="text-yellow-400">
            {expiringSoonCount} cert(s) expirant{expiringSoonCount > 1 ? 's' : ''}
          </span>
        )}
        {expiringSoonCount > 0 && siteCount > 0 && <span className="text-muted-foreground"> · </span>}
        {siteCount > 0 && <span className="text-muted-foreground">{siteCount} sites</span>}
        {expiringSoonCount === 0 && siteCount === 0 && <span className="text-emerald-400">Tout OK</span>}
      </p>
    </div>
  );
}

interface OverviewCardsProps {
  prtgAlerts: UseAutoRefreshReturn<PRTGSensorWithInstance[]>;
  veeamSummary: UseAutoRefreshReturn<VeeamSummary>;
}

export function OverviewCards({ prtgAlerts, veeamSummary }: OverviewCardsProps) {
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
          <div>
            <p className="text-foreground text-3xl font-extrabold tracking-tight">{alerts?.length ?? 0}</p>
            <p className="text-muted-foreground mt-1 text-xs">capteurs en alerte</p>
            <p className="mt-1.5 text-xs font-semibold">
              {downCount > 0 || warningCount > 0 ? (
                <>
                  {downCount > 0 && <span className="text-red-400">{downCount} Down</span>}
                  {downCount > 0 && warningCount > 0 && <span className="text-muted-foreground"> · </span>}
                  {warningCount > 0 && <span className="text-yellow-400">{warningCount} Warning</span>}
                </>
              ) : (
                <span className="text-emerald-400">Aucune alerte</span>
              )}
            </p>
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
        <BackupsContent veeamSummary={veeamSummary} />
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
