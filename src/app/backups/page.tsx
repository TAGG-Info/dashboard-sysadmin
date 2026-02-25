'use client';

import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { JobList } from '@/components/backups/JobList';
import { SessionTimeline } from '@/components/backups/SessionTimeline';
import { BackupCalendar } from '@/components/backups/BackupCalendar';
import { RepositoryBars } from '@/components/backups/RepositoryBars';
import { useVeeamSummary } from '@/hooks/useVeeam';
import { PageHeader } from '@/components/layout/PageHeader';

function BackupStats() {
  const { data: summary, loading } = useVeeamSummary();

  if (loading && !summary) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const { jobStats, vmsOverview } = summary;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 2xl:grid-cols-4">
      <StatCard label="VMs protegees" value={vmsOverview.ProtectedVms} />
      <StatCard label="Succes" value={jobStats.SuccessfulJobRuns} color="#10b981" />
      <StatCard label="Warnings" value={jobStats.WarningsJobRuns} color="#f59e0b" />
      <StatCard
        label="Echecs"
        value={jobStats.FailedJobRuns}
        color="#ef4444"
        badge={
          jobStats.FailedJobRuns > 0 ? (
            <StatusBadge status="critical" label={`${jobStats.FailedJobRuns} failed`} className="mt-1" />
          ) : undefined
        }
      />
    </div>
  );
}

export default function BackupsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Backups Veeam" source="veeam" />

      {/* Stats cards (VBEM summary) */}
      <BackupStats />

      {/* Job list (left) + Repository capacity (right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <JobList />
        <div className="self-start lg:sticky lg:top-4">
          <RepositoryBars />
        </div>
      </div>

      {/* Session timeline + Calendar (PS bridge) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-[5fr_3fr]">
        <Card>
          <CardContent className="p-4">
            <SessionTimeline />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <BackupCalendar />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
