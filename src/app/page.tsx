import { OverviewCards } from '@/components/dashboard/OverviewCards';
import { StatusGrid } from '@/components/dashboard/StatusGrid';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { PageHeader } from '@/components/layout/PageHeader';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      {/* Overview cards */}
      <OverviewCards />

      {/* Status grid + Recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatusGrid />
        <RecentActivity />
      </div>
    </div>
  );
}
