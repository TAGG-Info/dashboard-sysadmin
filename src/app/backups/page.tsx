'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { JobList } from '@/components/backups/JobList';
import { SessionTimeline } from '@/components/backups/SessionTimeline';
import { BackupCalendar } from '@/components/backups/BackupCalendar';
import { useVeeamJobs, useVeeamSessions } from '@/hooks/useVeeam';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePageRefresh } from '@/hooks/usePageRefresh';

function BackupStats() {
  const { data: jobs, loading: jobsLoading } = useVeeamJobs();
  const { data: sessions, loading: sessionsLoading } = useVeeamSessions();

  const stats = useMemo(() => {
    if (!sessions) return null;

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentSessions = sessions.filter(
      (s) => new Date(s.creationTime) >= last24h
    );

    const successes = recentSessions.filter(
      (s) => s.result.result.toLowerCase() === 'success'
    ).length;
    const failures = recentSessions.filter(
      (s) => s.result.result.toLowerCase() === 'failed' || s.result.result.toLowerCase() === 'error'
    ).length;
    const warnings = recentSessions.filter(
      (s) => s.result.result.toLowerCase() === 'warning'
    ).length;

    return {
      totalJobs: jobs?.length ?? 0,
      recentTotal: recentSessions.length,
      successes,
      failures,
      warnings,
    };
  }, [jobs, sessions]);

  const loading = jobsLoading || sessionsLoading;

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-card border-border/50">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard label="Total jobs" value={stats.totalJobs} />
      <StatCard label="Success 24h" value={stats.successes} color="#10b981" />
      <StatCard label="Warnings 24h" value={stats.warnings} color="#f59e0b" />
      <StatCard
        label="Echecs 24h"
        value={stats.failures}
        color="#ef4444"
        badge={stats.failures > 0 ? <StatusBadge status="critical" label={`${stats.failures} failed`} className="mt-1" /> : undefined}
      />
    </div>
  );
}

export default function BackupsPage() {
  const { refreshKey, loading, handleRefresh } = usePageRefresh();

  return (
    <div className="space-y-6" key={`backups-${refreshKey}`}>
      <PageHeader
        title="Backups Veeam"
        source="veeam"
        actions={<RefreshButton onRefresh={handleRefresh} loading={loading} />}
      />

      {/* Stats cards */}
      <BackupStats />

      {/* Job list */}
      <JobList />

      {/* Session timeline + Calendar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <SessionTimeline />
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <BackupCalendar />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
