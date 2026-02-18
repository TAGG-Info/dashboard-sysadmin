'use client';

import { useMemo } from 'react';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeAgo } from '@/components/ui/TimeAgo';
import { InstanceSectionHeader } from '@/components/ui/InstanceGroup';
import { usePRTGAlerts, type PRTGSensorWithInstance } from '@/hooks/usePRTG';
import type { PRTGSensor } from '@/types/prtg';

function statusToLevel(status: string): 'healthy' | 'warning' | 'critical' | 'info' | 'neutral' {
  switch (status) {
    case 'Down':
      return 'critical';
    case 'Warning':
    case 'Unusual':
      return 'warning';
    case 'Up':
      return 'healthy';
    case 'Paused':
      return 'neutral';
    default:
      return 'info';
  }
}

function PriorityStars({ priority }: { priority: number }) {
  return (
    <span className="text-sm text-muted-foreground" title={`Priorite: ${priority}/5`}>
      {'*'.repeat(Math.min(priority, 5))}
    </span>
  );
}

function AlertItem({ sensor }: { sensor: PRTGSensor }) {
  const prtgUrl = process.env.NEXT_PUBLIC_PRTG_URL || '';

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/30">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={statusToLevel(sensor.status)} label={sensor.status} />
          <PriorityStars priority={sensor.priority} />
        </div>
        <p className="text-sm font-medium text-foreground">{sensor.name}</p>
        {sensor.parentDeviceName && (
          <p className="text-sm text-muted-foreground">{sensor.parentDeviceName}</p>
        )}
        {sensor.metrics?.lastValue && (
          <p className="text-sm text-muted-foreground">
            Valeur: {sensor.metrics.lastValue}
          </p>
        )}
        {sensor.metrics?.message && (
          <p className="text-sm text-muted-foreground/70 italic">
            {sensor.metrics.message}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {sensor.metrics?.lastCheck && (
          <TimeAgo date={sensor.metrics.lastCheck} />
        )}
        {prtgUrl && (
          <ExternalLink
            href={`${prtgUrl}/sensor.htm?id=${sensor.id}`}
            label="Ouvrir dans PRTG"
            source="prtg"
          />
        )}
      </div>
    </div>
  );
}

export function AlertList() {
  const { data: alerts, loading, error } = usePRTGAlerts();

  // Sort alerts
  const sortedAlerts = useMemo(() => {
    if (!alerts) return [];
    return [...alerts].sort((a, b) => {
      const statusOrder: Record<string, number> = { Down: 0, Warning: 1, Unusual: 2 };
      const aOrder = statusOrder[a.status] ?? 3;
      const bOrder = statusOrder[b.status] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return b.priority - a.priority;
    });
  }, [alerts]);

  // Group by instance
  const instanceGroups = useMemo(() => {
    const map = new Map<string, { instanceName: string; items: PRTGSensorWithInstance[] }>();
    for (const alert of sortedAlerts) {
      const id = alert._instanceId ?? 'default';
      const name = alert._instanceName ?? '';
      if (!map.has(id)) {
        map.set(id, { instanceName: name, items: [] });
      }
      map.get(id)!.items.push(alert);
    }
    return Array.from(map.entries());
  }, [sortedAlerts]);

  const hasMultipleInstances = instanceGroups.length > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Alertes actives
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && !alerts ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center rounded-lg border border-destructive/30 p-6">
            <p className="text-sm text-destructive">
              Erreur de chargement des alertes: {error.message}
            </p>
          </div>
        ) : !alerts || alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
            <CheckCircle className="mb-2 h-8 w-8 text-[#10b981]" />
            <p className="text-sm font-medium text-foreground">
              Aucune alerte active
            </p>
            <p className="text-sm text-muted-foreground">
              Tous les sensors fonctionnent normalement
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {instanceGroups.map(([instanceId, { instanceName, items }]) => (
              <div key={instanceId}>
                {hasMultipleInstances && (
                  <InstanceSectionHeader instanceName={instanceName} className="mb-2" />
                )}
                {items.map((sensor) => (
                  <AlertItem key={`${instanceId}-${sensor.id}`} sensor={sensor} />
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
