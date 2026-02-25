'use client';

import { useMemo } from 'react';
import { Clock, Inbox } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TimeAgo } from '@/components/ui/TimeAgo';
import { Skeleton } from '@/components/ui/skeleton';
import { useTickets } from '@/hooks/useTickets';
import type { UseAutoRefreshReturn } from '@/hooks/useAutoRefresh';
import type { PRTGSensorWithInstance } from '@/hooks/usePRTG';

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
}

export function RecentActivity({ prtgAlerts }: RecentActivityProps) {
  const { data: alerts, loading: alertsLoading } = prtgAlerts;
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
  }, [alerts, tickets, prtgUrl, glpiUrl]);

  const isLoading = alertsLoading && !alerts && ticketsLoading && !tickets;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="text-muted-foreground h-4 w-4" />
            <span className="text-foreground text-sm font-semibold">Activite recente</span>
          </div>
          {events.length > 0 && <span className="text-muted-foreground text-[11px]">{events.length} ev.</span>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 py-1.5">
                <Skeleton className="mt-1 h-2 w-2 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Inbox className="text-muted-foreground/40 mb-2 h-6 w-6" />
            <p className="text-muted-foreground text-[11px]">Aucun evenement recent</p>
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto pr-1">
            {events.map((event) => {
              const dotColor =
                event.status === 'critical'
                  ? '#ef4444'
                  : event.status === 'warning'
                    ? '#f59e0b'
                    : event.status === 'healthy'
                      ? '#10b981'
                      : event.status === 'info'
                        ? '#3b82f6'
                        : '#6b7280';
              return (
                <div key={event.id} className="border-border flex items-start gap-3 border-b py-[7px] last:border-b-0">
                  <div className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground flex items-center gap-1 text-xs font-medium">
                      <span className="truncate">{event.title}</span>
                      <StatusBadge
                        status={event.status}
                        label={event.type === 'alert' ? 'Alerte' : event.type === 'backup' ? 'Backup' : 'Ticket'}
                      />
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-[11px]">
                      {event.source.toUpperCase()} &middot; <TimeAgo date={event.timestamp} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
