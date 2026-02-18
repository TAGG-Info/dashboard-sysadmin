'use client';

import { useMemo } from 'react';
import { Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SourceIndicator } from '@/components/ui/SourceIndicator';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TimeAgo } from '@/components/ui/TimeAgo';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { Skeleton } from '@/components/ui/skeleton';
import { usePRTGAlerts } from '@/hooks/usePRTG';
import { useVeeamSessions } from '@/hooks/useVeeam';
import { useTickets } from '@/hooks/useTickets';

import type { SourceName } from '@/types/common';

interface TimelineEvent {
  id: string;
  source: SourceName;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  status: 'healthy' | 'warning' | 'critical' | 'info' | 'neutral';
  link?: string;
  instanceName?: string;
}

const MAX_EVENTS = 20;

export function RecentActivity() {
  const { data: alerts, loading: alertsLoading } = usePRTGAlerts();
  const { data: sessions, loading: sessionsLoading } = useVeeamSessions();
  const { data: tickets, loading: ticketsLoading } = useTickets();

  const prtgUrl = process.env.NEXT_PUBLIC_PRTG_URL || '';
  const glpiUrl = process.env.NEXT_PUBLIC_GLPI_URL || '';

  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    // PRTG alerts (Down/Warning sensors)
    if (alerts) {
      alerts.forEach((sensor) => {
        const statusLevel = sensor.status === 'Down'
          ? 'critical' as const
          : sensor.status === 'Warning' || sensor.status === 'Unusual'
            ? 'warning' as const
            : 'info' as const;

        allEvents.push({
          id: `prtg-${sensor._instanceId ?? 'default'}-${sensor.id}`,
          source: 'prtg',
          type: 'alert',
          title: `${sensor.name} - ${sensor.status}`,
          description: sensor.parentDeviceName
            ? `${sensor.parentDeviceName}${sensor.metrics?.message ? ' - ' + sensor.metrics.message : ''}`
            : sensor.metrics?.message,
          timestamp: sensor.metrics?.lastCheck || new Date().toISOString(),
          status: statusLevel,
          link: prtgUrl ? `${prtgUrl}/sensor.htm?id=${sensor.id}` : undefined,
          instanceName: sensor._instanceName,
        });
      });
    }

    // Veeam sessions
    if (sessions) {
      // Only take recent sessions (last 48h)
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
      sessions
        .filter((s) => new Date(s.creationTime) >= cutoff)
        .forEach((session) => {
          const result = session.result.result.toLowerCase();
          const statusLevel = result === 'success'
            ? 'healthy' as const
            : result === 'warning'
              ? 'warning' as const
              : result === 'failed' || result === 'error'
                ? 'critical' as const
                : 'info' as const;

          allEvents.push({
            id: `veeam-${session._instanceId ?? 'default'}-${session.id}`,
            source: 'veeam',
            type: 'backup',
            title: `${session.name} - ${session.result.result}`,
            description: session.result.message || undefined,
            timestamp: session.endTime || session.creationTime,
            status: statusLevel,
            instanceName: session._instanceName,
          });
        });
    }

    // GLPI tickets (recently created or modified)
    if (tickets) {
      // Only take recent tickets (last 48h by date_mod)
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
      tickets
        .filter((t) => new Date(t.date_mod) >= cutoff)
        .forEach((ticket) => {
          const statusLevel = ticket.priority >= 5
            ? 'critical' as const
            : ticket.priority >= 4
              ? 'warning' as const
              : ticket.status === 1
                ? 'info' as const
                : 'neutral' as const;

          allEvents.push({
            id: `glpi-${ticket._instanceId ?? 'default'}-${ticket.id}`,
            source: 'glpi',
            type: 'ticket',
            title: `#${ticket.id} - ${ticket.name}`,
            description: undefined,
            timestamp: ticket.date_mod,
            status: statusLevel,
            link: glpiUrl ? `${glpiUrl}/front/ticket.form.php?id=${ticket.id}` : undefined,
            instanceName: ticket._instanceName,
          });
        });
    }

    // Sort by timestamp descending (most recent first)
    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit to MAX_EVENTS
    return allEvents.slice(0, MAX_EVENTS);
  }, [alerts, sessions, tickets, prtgUrl, glpiUrl]);

  const isLoading = (alertsLoading && !alerts) && (sessionsLoading && !sessions) && (ticketsLoading && !tickets);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Activite recente</h2>
        {events.length > 0 && (
          <span className="text-sm text-muted-foreground">{events.length} evenements</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border border-border/50">
              <Skeleton className="h-5 w-5 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-16 shrink-0" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 text-center">
          <Inbox className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            Aucun evenement recent
          </p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Les evenements des sources actives apparaitront ici
          </p>
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical timeline line */}
          <div className="absolute left-[15px] top-3 bottom-3 w-px bg-border/50" />

          {events.map((event, index) => (
            <div
              key={event.id}
              className="relative flex gap-3 py-2.5 pl-1 group"
            >
              {/* Timeline dot */}
              <div className="relative z-10 mt-0.5 shrink-0">
                <div
                  className="h-[10px] w-[10px] rounded-full border-2 border-background ring-2 ring-border/30 transition-all group-hover:ring-primary/30"
                  style={{
                    backgroundColor:
                      event.status === 'critical'
                        ? '#ef4444'
                        : event.status === 'warning'
                          ? '#f59e0b'
                          : event.status === 'healthy'
                            ? '#10b981'
                            : event.status === 'info'
                              ? '#3b82f6'
                              : '#6b7280',
                  }}
                />
              </div>

              {/* Event content */}
              <div className="flex-1 min-w-0 rounded-lg border border-border/30 bg-card/50 p-2.5 transition-colors hover:bg-accent/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <SourceIndicator source={event.source} connected />
                      <StatusBadge status={event.status} label={event.type === 'alert' ? 'Alerte' : event.type === 'backup' ? 'Backup' : 'Ticket'} />
                      {event.instanceName && (
                        <Badge variant="outline" className="text-sm text-muted-foreground border-border/50">
                          {event.instanceName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground leading-snug truncate">
                      {event.title}
                    </p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground/70 mt-0.5 truncate">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <TimeAgo date={event.timestamp} />
                    {event.link && (
                      <ExternalLink
                        href={event.link}
                        label=""
                        source={event.source}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
