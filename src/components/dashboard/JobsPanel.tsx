'use client';

import { useVeeamSummary } from '@/hooks/useVeeam';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { SourceLogo } from '@/components/ui/SourceLogo';
import { StatusBadge } from '@/components/ui/StatusBadge';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h${remainMins}min` : `${hours}h`;
}

export function JobsPanel() {
  const { data: summary, loading, error, refresh } = useVeeamSummary();

  if (error && !summary) {
    return <ErrorState title="Statistiques Veeam indisponibles" source="Veeam" onRetry={refresh} />;
  }

  if (loading && !summary) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <SourceLogo source="veeam" size={18} />
            <CardTitle className="text-sm">Statistiques Veeam</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-6 gap-y-0 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="my-2 h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const { jobStats, overview, vmsOverview } = summary;
  const successRate = vmsOverview.SuccessBackupPercents;

  const stats = [
    {
      label: 'Jobs planifies',
      value: jobStats.ScheduledJobs,
      sub: `${overview.RunningJobs} en cours`,
      status: overview.RunningJobs > 0 ? ('info' as const) : ('neutral' as const),
    },
    {
      label: 'Succes',
      value: jobStats.SuccessfulJobRuns,
      sub: `sur ${jobStats.TotalJobRuns} total`,
      status: 'healthy' as const,
    },
    {
      label: 'Warnings',
      value: jobStats.WarningsJobRuns,
      sub: jobStats.WarningsJobRuns > 0 ? 'attention requise' : 'aucun',
      status: jobStats.WarningsJobRuns > 0 ? ('warning' as const) : ('neutral' as const),
    },
    {
      label: 'Echecs',
      value: jobStats.FailedJobRuns,
      sub: jobStats.FailedJobRuns > 0 ? 'action requise' : 'aucun',
      status: jobStats.FailedJobRuns > 0 ? ('critical' as const) : ('neutral' as const),
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex h-[22px] w-[22px] items-center justify-center rounded-md"
              style={{ background: 'rgba(76,175,80,0.12)' }}
            >
              <SourceLogo source="veeam" size={14} />
            </span>
            <CardTitle className="text-[13px] font-semibold">Statistiques Veeam</CardTitle>
          </div>
          <StatusBadge
            status={successRate >= 99 ? 'healthy' : successRate >= 90 ? 'warning' : 'critical'}
            label={`${Math.round(successRate)}% succes`}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-x-6 gap-y-0 lg:grid-cols-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="border-border flex items-center justify-between border-b py-2 last:border-b-0"
            >
              <div>
                <div className="text-foreground text-[13px] font-medium">{s.label}</div>
                <div className="text-muted-foreground mt-0.5 text-[11px]">{s.sub}</div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-foreground text-lg font-bold">{s.value}</span>
                {s.status !== 'neutral' && <StatusBadge status={s.status} label={s.label} />}
              </div>
            </div>
          ))}
          {jobStats.MaxDurationBackupJobName && (
            <div className="border-border col-span-2 flex items-center justify-between border-t pt-2">
              <div>
                <div className="text-foreground text-[13px] font-medium">Job le plus long</div>
                <div className="text-muted-foreground mt-0.5 text-[11px]">{jobStats.MaxDurationBackupJobName}</div>
              </div>
              <span className="text-muted-foreground text-sm font-medium">
                {formatDuration(jobStats.MaxJobDuration)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
