'use client';

import { OverviewCards } from '@/components/dashboard/OverviewCards';
import { ResourceGauges } from '@/components/dashboard/ResourceGauges';
import { DashboardHypervisor } from '@/components/dashboard/DashboardHypervisor';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { BackupCalendar } from '@/components/backups/BackupCalendar';
import { TicketsBreakdown } from '@/components/dashboard/TicketsBreakdown';
import { JobsPanel } from '@/components/dashboard/JobsPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePRTGAlerts } from '@/hooks/usePRTG';
import { useVeeamSessions } from '@/hooks/useVeeam';

export default function DashboardPage() {
  const prtgAlerts = usePRTGAlerts();
  const veeamSessions = useVeeamSessions();

  return (
    <div className="space-y-5" style={{ zoom: 1.15 }}>
      <PageHeader title="Dashboard" subtitle="Vue d'ensemble de l'infrastructure" />

      {/* Row 1: Overview stat cards */}
      <OverviewCards prtgAlerts={prtgAlerts} veeamSessions={veeamSessions} />

      {/* Row 2: Gauges + Hyperviseur + Activité */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[auto_1fr_1fr]">
        <ResourceGauges />
        <DashboardHypervisor />
        <RecentActivity prtgAlerts={prtgAlerts} veeamSessions={veeamSessions} />
      </div>

      {/* Row 3: Calendrier + Tickets */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
        <BackupCalendar />
        <TicketsBreakdown />
      </div>

      {/* Row 4: Jobs Veeam */}
      <JobsPanel />
    </div>
  );
}
