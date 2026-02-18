import { OverviewCards } from '@/components/dashboard/OverviewCards';
import { StatusGrid } from '@/components/dashboard/StatusGrid';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

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
