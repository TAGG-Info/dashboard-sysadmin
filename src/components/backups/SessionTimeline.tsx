'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TimeAgo } from '@/components/ui/TimeAgo';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useVeeamSessions } from '@/hooks/useVeeam';

function sessionResultToStatus(result: string): 'healthy' | 'warning' | 'critical' | 'neutral' | 'info' {
  switch (result.toLowerCase()) {
    case 'success':
      return 'healthy';
    case 'warning':
      return 'warning';
    case 'failed':
    case 'error':
      return 'critical';
    case 'running':
    case 'working':
      return 'info';
    default:
      return 'neutral';
  }
}

function sessionResultLabel(result: string): string {
  switch (result.toLowerCase()) {
    case 'success':
      return 'Success';
    case 'warning':
      return 'Warning';
    case 'failed':
      return 'Failed';
    case 'running':
    case 'working':
      return 'En cours';
    case 'none':
      return 'N/A';
    default:
      return result;
  }
}

function resultDotColor(result: string): string {
  switch (result.toLowerCase()) {
    case 'success':
      return '#10b981';
    case 'warning':
      return '#f59e0b';
    case 'failed':
    case 'error':
      return '#ef4444';
    case 'running':
    case 'working':
      return '#3b82f6';
    default:
      return '#6b7280';
  }
}

function formatDuration(startISO: string, endISO?: string): string {
  if (!endISO) return 'En cours';

  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  const diffMs = end - start;

  if (diffMs < 0) return '-';

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function SessionTimeline() {
  const { data: sessions, loading, error, refresh } = useVeeamSessions();

  const recentSessions = useMemo(() => {
    if (!sessions) return [];
    return [...sessions]
      .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime())
      .slice(0, 20);
  }, [sessions]);

  // Detect if multiple instances
  const hasMultipleInstances = useMemo(() => {
    if (!sessions) return false;
    const ids = new Set(sessions.map((s) => s._instanceId ?? 'default'));
    return ids.size > 1;
  }, [sessions]);

  if (error && !sessions) {
    return <ErrorState title="Erreur Sessions Veeam" message={error.message} source="Veeam" onRetry={refresh} />;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-foreground text-base font-semibold">
        Sessions recentes
        {sessions && (
          <span className="text-muted-foreground ml-2 text-sm font-normal">
            ({Math.min(sessions.length, 20)} dernieres)
          </span>
        )}
      </h3>

      <div className="space-y-0">
        {loading && !sessions ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 py-3">
              <Skeleton className="mt-0.5 h-3 w-3 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))
        ) : recentSessions.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">Aucune session</p>
        ) : (
          recentSessions.map((session, index) => {
            const result = session.result.result;
            const dotColor = resultDotColor(result);
            const isLast = index === recentSessions.length - 1;

            return (
              <div key={session.id} className="relative flex items-start gap-3">
                {/* Timeline line */}
                {!isLast && <div className="bg-border/50 absolute top-[18px] bottom-0 left-[5px] w-[1px]" />}

                {/* Timeline dot */}
                <div
                  className="ring-background relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-2"
                  style={{ backgroundColor: dotColor }}
                />

                {/* Content */}
                <div className="min-w-0 flex-1 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground truncate text-sm font-medium">{session.name}</span>
                    {hasMultipleInstances && session._instanceName && (
                      <Badge variant="outline" className="text-muted-foreground border-border/60 text-sm">
                        {session._instanceName}
                      </Badge>
                    )}
                    <StatusBadge status={sessionResultToStatus(result)} label={sessionResultLabel(result)} />
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <TimeAgo date={session.creationTime} />
                    <span className="text-muted-foreground text-sm">
                      Duree : {formatDuration(session.creationTime, session.endTime)}
                    </span>
                  </div>
                  {session.result.message && (
                    <p className="text-muted-foreground/70 mt-0.5 truncate text-sm">{session.result.message}</p>
                  )}
                  {session.progress !== undefined && session.state === 'Working' && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full bg-[#00B336] transition-all duration-500"
                          style={{ width: `${session.progress}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground text-sm">{Math.round(session.progress)}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
