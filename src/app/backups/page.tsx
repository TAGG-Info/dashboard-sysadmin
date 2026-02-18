'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { JobList } from '@/components/backups/JobList';
import { SessionTimeline } from '@/components/backups/SessionTimeline';
import { BackupCalendar } from '@/components/backups/BackupCalendar';
import { useVeeamJobs, useVeeamSessions } from '@/hooks/useVeeam';

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
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total jobs</p>
          <p className="text-xl font-bold text-foreground">{stats.totalJobs}</p>
        </CardContent>
      </Card>
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Success 24h</p>
          <p className="text-xl font-bold text-[#10b981]">{stats.successes}</p>
        </CardContent>
      </Card>
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Warnings 24h</p>
          <p className="text-xl font-bold text-[#f59e0b]">{stats.warnings}</p>
        </CardContent>
      </Card>
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Echecs 24h</p>
          <p className="text-xl font-bold text-[#ef4444]">{stats.failures}</p>
          {stats.failures > 0 && (
            <StatusBadge status="critical" label={`${stats.failures} failed`} className="mt-1" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BackupsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return (
    <div className="space-y-6" key={`backups-${refreshKey}`}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Backups Veeam</h1>
        <RefreshButton onRefresh={handleRefresh} loading={loading} />
      </div>

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
