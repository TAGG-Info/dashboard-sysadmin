'use client';

import { OverviewCards } from '@/components/dashboard/OverviewCards';
import { StatusGrid } from '@/components/dashboard/StatusGrid';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePRTGAlerts } from '@/hooks/usePRTG';
import { useVeeamSessions } from '@/hooks/useVeeam';

export default function DashboardPage() {
  // Lifted hooks: shared between OverviewCards and RecentActivity (avoids duplicate fetches)
  const prtgAlerts = usePRTGAlerts();
  const veeamSessions = useVeeamSessions();

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      {/* Overview cards */}
      <OverviewCards prtgAlerts={prtgAlerts} veeamSessions={veeamSessions} />

      {/* Status grid + Recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatusGrid />
        <RecentActivity prtgAlerts={prtgAlerts} veeamSessions={veeamSessions} />
      </div>
    </div>
  );
}
