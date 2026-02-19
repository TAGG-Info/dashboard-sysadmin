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
import { useVeeamSummary } from '@/hooks/useVeeam';

export default function DashboardPage() {
  const prtgAlerts = usePRTGAlerts();
  const veeamSummary = useVeeamSummary();

  return (
    <div className="space-y-5" style={{ zoom: 1.15 }}>
      <PageHeader title="Dashboard" subtitle="Vue d'ensemble de l'infrastructure" />

      {/* Row 1: Overview stat cards */}
      <OverviewCards prtgAlerts={prtgAlerts} veeamSummary={veeamSummary} />

      {/* Rows 2-3: Gauges/Calendar + Hyperviseur/Tickets + Activité */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[auto_1fr_380px]">
        <div className="space-y-4">
          <ResourceGauges />
          <BackupCalendar />
        </div>
        <div className="space-y-4">
          <DashboardHypervisor />
          <TicketsBreakdown />
        </div>
        <RecentActivity prtgAlerts={prtgAlerts} />
      </div>

      {/* Row 4: Jobs Veeam */}
      <JobsPanel />
    </div>
  );
}
