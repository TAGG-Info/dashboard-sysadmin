'use client';

import { useMemo } from 'react';
import { Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SourceIndicator } from '@/components/ui/SourceIndicator';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TimeAgo } from '@/components/ui/TimeAgo';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { Skeleton } from '@/components/ui/skeleton';
import { useTickets } from '@/hooks/useTickets';
import type { UseAutoRefreshReturn } from '@/hooks/useAutoRefresh';
import type { PRTGSensorWithInstance } from '@/hooks/usePRTG';
import type { VeeamSessionWithInstance } from '@/hooks/useVeeam';

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

interface RecentActivityProps {
  prtgAlerts: UseAutoRefreshReturn<PRTGSensorWithInstance[]>;
  veeamSessions: UseAutoRefreshReturn<VeeamSessionWithInstance[]>;
}

export function RecentActivity({ prtgAlerts, veeamSessions }: RecentActivityProps) {
  const { data: alerts, loading: alertsLoading } = prtgAlerts;
  const { data: sessions, loading: sessionsLoading } = veeamSessions;
  const { data: tickets, loading: ticketsLoading } = useTickets();

  const prtgUrl = process.env.NEXT_PUBLIC_PRTG_URL || '';
  const glpiUrl = process.env.NEXT_PUBLIC_GLPI_URL || '';

  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    // PRTG alerts (Down/Warning sensors)
    if (alerts) {
      alerts.forEach((sensor) => {
        const statusLevel =
          sensor.status === 'Down'
            ? ('critical' as const)
            : sensor.status === 'Warning' || sensor.status === 'Unusual'
              ? ('warning' as const)
              : ('info' as const);

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
      // eslint-disable-next-line react-hooks/purity
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
      sessions
        .filter((s) => new Date(s.creationTime) >= cutoff)
        .forEach((session) => {
          const result = session.result.result.toLowerCase();
          const statusLevel =
            result === 'success'
              ? ('healthy' as const)
              : result === 'warning'
                ? ('warning' as const)
                : result === 'failed' || result === 'error'
                  ? ('critical' as const)
                  : ('info' as const);

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
      // eslint-disable-next-line react-hooks/purity
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
      tickets
        .filter((t) => new Date(t.date_mod) >= cutoff)
        .forEach((ticket) => {
          const statusLevel =
            ticket.priority >= 5
              ? ('critical' as const)
              : ticket.priority >= 4
                ? ('warning' as const)
                : ticket.status === 1
                  ? ('info' as const)
                  : ('neutral' as const);

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

  const isLoading = alertsLoading && !alerts && sessionsLoading && !sessions && ticketsLoading && !tickets;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-sm font-semibold">Activite recente</h2>
        {events.length > 0 && <span className="text-muted-foreground text-sm">{events.length} evenements</span>}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-border/50 flex gap-3 rounded-lg border p-3">
              <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-16 shrink-0" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="border-border flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
          <Inbox className="text-muted-foreground/40 mb-3 h-8 w-8" />
          <p className="text-muted-foreground text-sm font-medium">Aucun evenement recent</p>
          <p className="text-muted-foreground/60 mt-1 text-sm">Les evenements des sources actives apparaitront ici</p>
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical timeline line */}
          <div className="bg-border/50 absolute top-3 bottom-3 left-[15px] w-px" />

          {events.map((event, index) => (
            <div key={event.id} className="group relative flex gap-3 py-2.5 pl-1">
              {/* Timeline dot */}
              <div className="relative z-10 mt-0.5 shrink-0">
                <div
                  className="border-background ring-border/30 group-hover:ring-primary/30 h-[10px] w-[10px] rounded-full border-2 ring-2 transition-all"
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
              <div className="border-border/30 bg-card/50 hover:bg-accent/20 min-w-0 flex-1 rounded-lg border p-2.5 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <SourceIndicator source={event.source} connected />
                      <StatusBadge
                        status={event.status}
                        label={event.type === 'alert' ? 'Alerte' : event.type === 'backup' ? 'Backup' : 'Ticket'}
                      />
                      {event.instanceName && (
                        <Badge variant="outline" className="text-muted-foreground border-border/50 text-sm">
                          {event.instanceName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-foreground truncate text-sm leading-snug font-medium">{event.title}</p>
                    {event.description && (
                      <p className="text-muted-foreground/70 mt-0.5 truncate text-sm">{event.description}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <TimeAgo date={event.timestamp} />
                    {event.link && <ExternalLink href={event.link} label="" source={event.source} />}
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
