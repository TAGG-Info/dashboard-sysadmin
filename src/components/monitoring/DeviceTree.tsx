'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Monitor } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { Skeleton } from '@/components/ui/skeleton';
import { SensorCard } from './SensorCard';
import { usePRTGDevices, usePRTGSensors } from '@/hooks/usePRTG';
import { InstanceSectionHeader, groupByInstance, hasMultipleInstances } from '@/components/ui/InstanceGroup';
import { prtgStatusToLevel } from '@/lib/status-mappers';
import type { PRTGDevice } from '@/types/prtg';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  Up: '#10b981',
  Warning: '#f59e0b',
  Down: '#ef4444',
  Paused: '#6b7280',
  Unusual: '#f59e0b',
  Unknown: '#6b7280',
};

function DeviceSensors({ deviceId }: { deviceId: number }) {
  const { data: sensors, loading } = usePRTGSensors(deviceId);

  if (loading && !sensors) {
    return (
      <div className="space-y-2 pt-2 pl-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!sensors || sensors.length === 0) {
    return (
      <div className="pt-2 pl-4">
        <p className="text-muted-foreground text-sm">Aucun sensor</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 pt-2 pl-4 sm:grid-cols-2 lg:grid-cols-3">
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
    <Card className={cn('transition-colors', expanded && 'ring-border ring-1')}>
      <CardContent className="p-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="hover:bg-accent/30 flex w-full items-center gap-3 p-4 text-left transition-colors"
        >
          {/* Expand/collapse icon */}
          <div className="text-muted-foreground shrink-0">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>

          {/* Status dot */}
          <div
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: statusColors[device.status] || '#6b7280' }}
          />

          {/* Device info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Monitor className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <p className="text-foreground truncate text-sm font-medium">{device.name}</p>
            </div>
            <p className="text-muted-foreground text-sm">{device.host}</p>
          </div>

          {/* Sensor counts */}
          {sensors && (
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
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
          <StatusBadge status={prtgStatusToLevel(device.status)} label={device.status} />

          {/* External link */}
          {prtgUrl && (
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <ExternalLink href={`${prtgUrl}/device.htm?id=${device.id}`} label="PRTG" source="prtg" />
            </div>
          )}
        </button>

        {/* Expanded sensors */}
        {expanded && (
          <div className="border-border border-t p-4">
            <DeviceSensors deviceId={device.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DeviceTree() {
  const { data: devices, loading, error } = usePRTGDevices();

  // Group devices by instance
  const instanceGroups = useMemo(() => {
    if (!devices) return [];
    return groupByInstance(devices);
  }, [devices]);

  const multipleInstances = devices ? hasMultipleInstances(devices) : false;

  if (loading && !devices) {
    return (
      <div className="space-y-3">
        <h2 className="text-foreground text-sm font-semibold">Devices</h2>
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
        <h2 className="text-foreground text-sm font-semibold">Devices</h2>
        <div className="border-destructive/30 flex items-center justify-center rounded-lg border p-8">
          <p className="text-destructive text-sm">Erreur de chargement</p>
        </div>
      </div>
    );
  }

  if (!devices || devices.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-foreground text-sm font-semibold">Devices</h2>
        <div className="border-border flex items-center justify-center rounded-lg border-2 border-dashed p-8">
          <p className="text-muted-foreground text-sm">Aucun device PRTG</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-sm font-semibold">Devices</h2>
        <span className="text-muted-foreground text-sm">{devices.length} devices</span>
      </div>
      {instanceGroups.map(({ instanceId, instanceName, items }) => (
        <div key={instanceId} className="space-y-2">
          {multipleInstances && <InstanceSectionHeader instanceName={instanceName} />}
          {items.map((device) => (
            <DeviceCard key={`${instanceId}-${device.id}`} device={device} />
          ))}
        </div>
      ))}
    </div>
  );
}
