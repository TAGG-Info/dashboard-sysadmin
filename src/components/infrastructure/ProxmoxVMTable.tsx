'use client';

import { useMemo, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { InstanceSectionHeader } from '@/components/ui/InstanceGroup';
import { useColumnResize } from '@/hooks/useColumnResize';
import { useProxmoxVMs } from '@/hooks/useInfrastructure';

const COLS = [
  { label: 'Type', align: 'left' as const },
  { label: 'Nom', align: 'left' as const },
  { label: 'Node', align: 'left' as const },
  { label: 'Etat', align: 'left' as const },
  { label: 'CPU', align: 'right' as const },
  { label: 'RAM', align: 'right' as const },
  { label: 'Lien', align: 'right' as const },
] as const;

const DEFAULT_WIDTHS = [70, 200, 120, 100, 80, 140, 80];

function vmStatusToLevel(status: string): 'healthy' | 'warning' | 'critical' | 'neutral' {
  switch (status.toLowerCase()) {
    case 'running':
      return 'healthy';
    case 'stopped':
      return 'neutral';
    case 'paused':
      return 'warning';
    default:
      return 'neutral';
  }
}

function vmStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case 'running':
      return 'Running';
    case 'stopped':
      return 'Stopped';
    case 'paused':
      return 'Paused';
    default:
      return status;
  }
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(1)} Go`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} Mo`;
}

export function ProxmoxVMTable({ refreshSignal }: { refreshSignal?: number }) {
  const { data: vms, loading, error, refresh } = useProxmoxVMs();

  const refreshRef = useRef<(() => Promise<void>) | undefined>(undefined);
  refreshRef.current = refresh;
  useEffect(() => { if (refreshSignal) refreshRef.current?.(); }, [refreshSignal]);
  const { widths, startResize, resetWidths } = useColumnResize(DEFAULT_WIDTHS);

  const proxmoxUrl = process.env.NEXT_PUBLIC_PROXMOX_URL;

  const sortedVMs = useMemo(() => {
    if (!vms) return [];
    return [...vms].sort((a, b) => a.name.localeCompare(b.name));
  }, [vms]);

  // Group by instance
  const instanceGroups = useMemo(() => {
    const map = new Map<string, { instanceName: string; items: typeof sortedVMs }>();
    for (const vm of sortedVMs) {
      const id = vm._instanceId ?? 'default';
      const name = vm._instanceName ?? '';
      if (!map.has(id)) {
        map.set(id, { instanceName: name, items: [] });
      }
      map.get(id)!.items.push(vm);
    }
    return Array.from(map.entries());
  }, [sortedVMs]);

  const hasMultipleInstances = instanceGroups.length > 1;

  if (error && !vms) {
    return (
      <ErrorState
        title="Erreur Proxmox VMs"
        message={error.message}
        source="Proxmox"
        onRetry={refresh}
      />
    );
  }

  const tableWidth = widths.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          VMs & Containers
          {vms && (
            <span className="ml-2 text-sm text-muted-foreground font-normal">
              ({vms.length})
            </span>
          )}
        </h3>
        <button
          onClick={resetWidths}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Reinitialiser la largeur des colonnes"
        >
          Reset colonnes
        </button>
      </div>

      {instanceGroups.map(([instanceId, { instanceName, items }]) => (
        <div key={instanceId}>
          {hasMultipleInstances && (
            <InstanceSectionHeader instanceName={instanceName} className="mb-2" />
          )}
          <div className="rounded-lg border border-border/50 overflow-x-auto">
            <table className="table-fixed text-sm" style={{ width: tableWidth }}>
              <colgroup>
                {widths.map((w, i) => <col key={i} style={{ width: w }} />)}
              </colgroup>
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  {COLS.map((col, i) => {
                    const isLast = i === COLS.length - 1;
                    return (
                      <th
                        key={col.label}
                        className={`relative px-3 py-2 text-xs font-medium text-muted-foreground select-none text-${col.align}`}
                      >
                        <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{col.label}</span>
                        {!isLast && (
                          <div
                            onPointerDown={(e) => startResize(e, i)}
                            className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize group"
                          >
                            <div className="mx-auto h-full w-px bg-border/0 group-hover:bg-border/60 transition-colors" />
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {loading && !vms ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-10" /></td>
                      <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-32" /></td>
                      <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-20" /></td>
                      <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-16" /></td>
                      <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-8" /></td>
                      <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-16" /></td>
                      <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-12" /></td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      Aucune VM ou container
                    </td>
                  </tr>
                ) : (
                  items.map((vm) => {
                    const isQemu = vm.type === 'qemu';
                    const typeLabel = isQemu ? 'VM' : 'CT';
                    const linkType = isQemu ? 'qemu' : 'lxc';

                    return (
                      <tr key={`${instanceId}-${vm.node}-${vm.type}-${vm.vmid}`} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                        <td className="px-3 py-1.5 overflow-hidden">
                          <Badge
                            variant="outline"
                            className={
                              isQemu
                                ? 'text-[#E87D0D] border-[#E87D0D]/30 text-xs'
                                : 'text-[#3b82f6] border-[#3b82f6]/30 text-xs'
                            }
                          >
                            {typeLabel}
                          </Badge>
                        </td>
                        <td className="px-3 py-1.5 overflow-hidden text-xs font-medium text-foreground">
                          <span className="block truncate">{vm.name}</span>
                        </td>
                        <td className="px-3 py-1.5 overflow-hidden text-xs text-muted-foreground">
                          <span className="block truncate">{vm.node}</span>
                        </td>
                        <td className="px-3 py-1.5 overflow-hidden">
                          <StatusBadge
                            status={vmStatusToLevel(vm.status)}
                            label={vmStatusLabel(vm.status)}
                          />
                        </td>
                        <td className="px-3 py-1.5 overflow-hidden text-right text-xs text-muted-foreground">
                          <span className="block truncate">{vm.cpus} vCPU</span>
                        </td>
                        <td className="px-3 py-1.5 overflow-hidden text-right text-xs text-muted-foreground">
                          <span className="block truncate">
                            {vm.status === 'running' && vm.mem > 0
                              ? `${formatBytes(vm.mem)} / ${formatBytes(vm.maxmem)}`
                              : formatBytes(vm.maxmem)}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 overflow-hidden text-right">
                          {proxmoxUrl && (
                            <ExternalLink
                              href={`${proxmoxUrl}/#v1:0:=${linkType}/${vm.vmid}`}
                              label="Proxmox"
                              source="proxmox"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Show loading skeletons when no data */}
      {loading && !vms && instanceGroups.length === 0 && (
        <div className="rounded-lg border border-border/50 overflow-x-auto">
          <table className="table-fixed text-sm" style={{ width: tableWidth }}>
            <colgroup>
              {widths.map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                {COLS.map((col) => (
                  <th
                    key={col.label}
                    className={`px-3 py-2 text-xs font-medium text-muted-foreground select-none text-${col.align}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-10" /></td>
                  <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-32" /></td>
                  <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-20" /></td>
                  <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-16" /></td>
                  <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-8" /></td>
                  <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-16" /></td>
                  <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-12" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
