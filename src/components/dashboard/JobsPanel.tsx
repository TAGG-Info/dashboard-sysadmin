'use client';

import { useMemo } from 'react';
import { useVeeamSessions } from '@/hooks/useVeeam';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { SourceLogo } from '@/components/ui/SourceLogo';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatTimeAgo } from '@/lib/formatters';
import type { VeeamResult } from '@/types/veeam';

type StatusLevel = 'healthy' | 'warning' | 'critical' | 'info' | 'neutral' | 'new';

function resultToStatusLevel(result: VeeamResult): StatusLevel {
  if (result === 'Success') return 'healthy';
  if (result === 'Warning') return 'warning';
  if (result === 'Failed') return 'critical';
  return 'neutral';
}

export function JobsPanel() {
  const { data: sessions, loading, error, refresh } = useVeeamSessions();

  const latestByJob = useMemo(() => {
    if (!sessions) return [];
    const map = new Map<string, (typeof sessions)[number]>();
    for (const s of sessions) {
      const existing = map.get(s.name);
      if (!existing || new Date(s.creationTime) > new Date(existing.creationTime)) {
        map.set(s.name, s);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime(),
    );
  }, [sessions]);

  if (error && !sessions) {
    return <ErrorState title="Jobs Veeam indisponibles" source="Veeam" onRetry={refresh} />;
  }

  if (loading && !sessions) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <SourceLogo source="veeam" size={18} />
            <CardTitle className="text-sm">Jobs Veeam &mdash; Dernier r&eacute;sultat</CardTitle>
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <SourceLogo source="veeam" size={18} />
          <CardTitle className="text-sm">Jobs Veeam &mdash; Dernier r&eacute;sultat</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-x-6 gap-y-0 lg:grid-cols-2">
          {latestByJob.map((s) => (
            <div key={s.id} className="border-border flex items-center justify-between border-b py-2 last:border-b-0">
              <div>
                <div className="text-foreground text-[13px] font-medium">{s.name}</div>
                <div className="text-muted-foreground mt-0.5 text-[11px]">{s.sessionType}</div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <StatusBadge status={resultToStatusLevel(s.result.result)} label={s.result.result} />
                <span className="text-muted-foreground text-[11px]">{formatTimeAgo(s.creationTime)}</span>
              </div>
            </div>
          ))}
          {latestByJob.length === 0 && (
            <p className="text-muted-foreground col-span-2 py-4 text-center text-sm">Aucune session</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
