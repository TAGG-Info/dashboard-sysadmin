'use client';

import { useMemo } from 'react';
import { usePRTGDevices, type PRTGDeviceWithInstance } from '@/hooks/usePRTG';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { InstanceSectionHeader } from '@/components/ui/InstanceGroup';
import type { PRTGDevice } from '@/types/prtg';

const statusColors: Record<string, string> = {
  Up: '#10b981',
  Warning: '#f59e0b',
  Down: '#ef4444',
  Paused: '#6b7280',
  Unusual: '#f59e0b',
  Unknown: '#6b7280',
};

function DeviceSquare({ device }: { device: PRTGDevice }) {
  const color = statusColors[device.status] || '#6b7280';
  const sensors = device.metrics?.sensors;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="h-8 w-8 cursor-pointer rounded transition-transform hover:scale-110"
          style={{ backgroundColor: color }}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{device.name}</p>
          <p className="text-muted-foreground text-sm">{device.host}</p>
          {sensors && (
            <div className="flex gap-2 text-sm">
              <span style={{ color: '#10b981' }}>{sensors.up} up</span>
              {sensors.down > 0 && <span style={{ color: '#ef4444' }}>{sensors.down} down</span>}
              {sensors.warning > 0 && <span style={{ color: '#f59e0b' }}>{sensors.warning} warn</span>}
              {sensors.paused > 0 && <span style={{ color: '#6b7280' }}>{sensors.paused} paused</span>}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function StatusGrid() {
  const { data: devices, loading, error } = usePRTGDevices();

  // Group by instance
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
        <h2 className="text-foreground text-base font-semibold">Carte des devices</h2>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !devices || devices.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-foreground text-base font-semibold">Carte des devices</h2>
        <div className="border-border/60 flex items-center justify-center rounded-lg border-2 border-dashed p-8">
          <p className="text-muted-foreground text-sm">{error ? 'Erreur de chargement des devices' : 'Aucun device'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-base font-semibold">Carte des devices</h2>
        <span className="text-muted-foreground text-sm">{devices.length} devices</span>
      </div>
      {instanceGroups.map(([instanceId, { instanceName, items }]) => (
        <div key={instanceId}>
          {hasMultipleInstances && <InstanceSectionHeader instanceName={instanceName} className="mb-1" />}
          <div className="flex flex-wrap gap-1.5">
            {items.map((device) => (
              <DeviceSquare key={`${instanceId}-${device.id}`} device={device} />
            ))}
          </div>
        </div>
      ))}
      {/* Legend */}
      <div className="text-muted-foreground flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: '#10b981' }} />
          Up
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: '#f59e0b' }} />
          Warning
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: '#ef4444' }} />
          Down
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: '#6b7280' }} />
          Paused
        </div>
      </div>
    </div>
  );
}
