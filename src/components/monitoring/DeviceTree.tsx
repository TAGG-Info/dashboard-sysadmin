'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Monitor } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { Skeleton } from '@/components/ui/skeleton';
import { SensorCard } from './SensorCard';
import { usePRTGDevices, usePRTGSensors } from '@/hooks/usePRTG';
import { InstanceSectionHeader } from '@/components/ui/InstanceGroup';
import type { PRTGDevice, PRTGSensor } from '@/types/prtg';
import type { PRTGDeviceWithInstance } from '@/hooks/usePRTG';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  Up: '#10b981',
  Warning: '#f59e0b',
  Down: '#ef4444',
  Paused: '#6b7280',
  Unusual: '#f59e0b',
  Unknown: '#6b7280',
};

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

function DeviceSensors({ deviceId }: { deviceId: number }) {
  const { data: sensors, loading } = usePRTGSensors(deviceId);

  if (loading && !sensors) {
    return (
      <div className="space-y-2 pl-4 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!sensors || sensors.length === 0) {
    return (
      <div className="pl-4 pt-2">
        <p className="text-sm text-muted-foreground">Aucun sensor</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 pl-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
      {sensors.map((sensor) => (
        <SensorCard key={sensor.id} sensor={sensor} />
      ))}
    </div>
  );
}

function DeviceCard({ device }: { device: PRTGDevice }) {
  const [expanded, setExpanded] = useState(false);
  const sensors = device.metrics?.sensors;
  const prtgUrl = process.env.NEXT_PUBLIC_PRTG_URL || '';

  return (
    <Card className={cn(
      'transition-colors',
      expanded && 'ring-1 ring-border'
    )}>
      <CardContent className="p-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent/30"
        >
          {/* Expand/collapse icon */}
          <div className="shrink-0 text-muted-foreground">
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>

          {/* Status dot */}
          <div
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: statusColors[device.status] || '#6b7280' }}
          />

          {/* Device info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-sm font-medium text-foreground truncate">
                {device.name}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{device.host}</p>
          </div>

          {/* Sensor counts */}
          {sensors && (
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              {sensors.up > 0 && (
                <span className="text-sm font-medium" style={{ color: '#10b981' }}>
                  {sensors.up}
                </span>
              )}
              {sensors.down > 0 && (
                <span className="text-sm font-medium" style={{ color: '#ef4444' }}>
                  {sensors.down}
                </span>
              )}
              {sensors.warning > 0 && (
                <span className="text-sm font-medium" style={{ color: '#f59e0b' }}>
                  {sensors.warning}
                </span>
              )}
              {sensors.unusual > 0 && (
                <span className="text-sm font-medium" title="Unusual" style={{ color: '#f59e0b' }}>
                  ~{sensors.unusual}
                </span>
              )}
              {sensors.paused > 0 && (
                <span className="text-sm font-medium" title="Paused" style={{ color: '#6b7280' }}>
                  ‖{sensors.paused}
                </span>
              )}
            </div>
          )}

          {/* Status badge */}
          <StatusBadge
            status={statusToLevel(device.status)}
            label={device.status}
          />

          {/* External link */}
          {prtgUrl && (
            <div
              className="shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink
                href={`${prtgUrl}/device.htm?id=${device.id}`}
                label="PRTG"
                source="prtg"
              />
            </div>
          )}
        </button>

        {/* Expanded sensors */}
        {expanded && (
          <div className="border-t border-border p-4">
            <DeviceSensors deviceId={device.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DeviceTree({ refreshSignal }: { refreshSignal?: number }) {
  const { data: devices, loading, error, refresh } = usePRTGDevices();

  const refreshRef = useRef<(() => Promise<void>) | undefined>(undefined);
  refreshRef.current = refresh;
  useEffect(() => { if (refreshSignal) refreshRef.current?.(); }, [refreshSignal]);

  // Group devices by instance
  const instanceGroups = useMemo(() => {
    if (!devices) return [];
    const map = new Map<string, { instanceName: string; items: PRTGDeviceWithInstance[] }>();
    for (const device of devices) {
      const id = device._instanceId ?? 'default';
      const name = device._instanceName ?? '';
      if (!map.has(id)) {
        map.set(id, { instanceName: name, items: [] });
      }
      map.get(id)!.items.push(device);
    }
    return Array.from(map.entries());
  }, [devices]);

  const hasMultipleInstances = instanceGroups.length > 1;

  if (loading && !devices) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Devices</h2>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Devices</h2>
        <div className="flex items-center justify-center rounded-lg border border-destructive/30 p-8">
          <p className="text-sm text-destructive">
            Erreur de chargement: {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!devices || devices.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Devices</h2>
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border p-8">
          <p className="text-sm text-muted-foreground">Aucun device PRTG</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Devices</h2>
        <span className="text-sm text-muted-foreground">
          {devices.length} devices
        </span>
      </div>
      {instanceGroups.map(([instanceId, { instanceName, items }]) => (
        <div key={instanceId} className="space-y-2">
          {hasMultipleInstances && (
            <InstanceSectionHeader instanceName={instanceName} />
          )}
          {items.map((device) => (
            <DeviceCard key={`${instanceId}-${device.id}`} device={device} />
          ))}
        </div>
      ))}
    </div>
  );
}
