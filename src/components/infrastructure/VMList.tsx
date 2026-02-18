'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { InstanceSectionHeader } from '@/components/ui/InstanceGroup';
import { useColumnResize } from '@/hooks/useColumnResize';
import { useVCenterVMs, useVCenterHosts } from '@/hooks/useInfrastructure';

const COLS = [
  { label: 'Nom', align: 'left' as const },
  { label: 'Etat', align: 'left' as const },
  { label: 'Host', align: 'left' as const },
  { label: 'CPU', align: 'right' as const },
  { label: 'RAM', align: 'right' as const },
  { label: 'Lien', align: 'right' as const },
] as const;

const DEFAULT_WIDTHS = [200, 100, 160, 80, 100, 80];

function powerStateToStatus(state: string): 'healthy' | 'warning' | 'neutral' {
  switch (state.toUpperCase()) {
    case 'POWERED_ON':
      return 'healthy';
    case 'SUSPENDED':
      return 'warning';
    case 'POWERED_OFF':
    default:
      return 'neutral';
  }
}

function powerStateLabel(state: string): string {
  switch (state.toUpperCase()) {
    case 'POWERED_ON':
      return 'On';
    case 'POWERED_OFF':
      return 'Off';
    case 'SUSPENDED':
      return 'Suspended';
    default:
      return state;
  }
}

function formatMemory(mib: number): string {
  const gb = mib / 1024;
  if (gb >= 1) {
    return `${gb.toFixed(1)} Go`;
  }
  return `${mib} MiB`;
}

export function VMList({ refreshSignal }: { refreshSignal?: number }) {
  const { data: vms, loading, error, refresh } = useVCenterVMs();

  const refreshRef = useRef<(() => Promise<void>) | undefined>(undefined);
  refreshRef.current = refresh;
  useEffect(() => { if (refreshSignal) refreshRef.current?.(); }, [refreshSignal]);
  const { data: hosts } = useVCenterHosts();
  const [filterPower, setFilterPower] = useState<string>('all');
  const { widths, startResize, resetWidths } = useColumnResize(DEFAULT_WIDTHS);

  const vcenterUrl = process.env.NEXT_PUBLIC_VCENTER_URL;

  // Map "instanceId:hostId" -> hostName for display
  const hostNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!hosts) return map;
    for (const h of hosts) {
      const instanceId = h._instanceId ?? 'default';
      map.set(`${instanceId}:${h.host}`, h.name);
    }
    return map;
  }, [hosts]);

  const filteredVMs = useMemo(() => {
    if (!vms) return [];
    let filtered = [...vms];
    if (filterPower !== 'all') {
      filtered = filtered.filter((vm) => vm.power_state === filterPower);
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [vms, filterPower]);

  // Group by instance
  const instanceGroups = useMemo(() => {
    const map = new Map<string, { instanceName: string; vms: typeof filteredVMs }>();
    for (const vm of filteredVMs) {
      const id = vm._instanceId ?? 'default';
      const name = vm._instanceName ?? '';
      if (!map.has(id)) {
        map.set(id, { instanceName: name, vms: [] });
      }
      map.get(id)!.vms.push(vm);
    }
    return Array.from(map.entries());
  }, [filteredVMs]);

  const hasMultipleInstances = instanceGroups.length > 1;

  if (error && !vms) {
    return (
      <ErrorState
        title="Erreur VMware VMs"
        message={error.message}
        source="VMware"
        onRetry={refresh}
      />
    );
  }


  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Machines virtuelles
          {vms && (
            <span className="ml-2 text-sm text-muted-foreground font-normal">
              ({filteredVMs.length}/{vms.length})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={resetWidths}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Reinitialiser la largeur des colonnes"
          >
            Reset colonnes
          </button>
          <Select value={filterPower} onValueChange={setFilterPower}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue placeholder="Etat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les etats</SelectItem>
              <SelectItem value="POWERED_ON">On</SelectItem>
              <SelectItem value="POWERED_OFF">Off</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {instanceGroups.map(([instanceId, { instanceName, vms: groupVMs }]) => (
        <div key={instanceId}>
          {hasMultipleInstances && (
            <InstanceSectionHeader instanceName={instanceName} className="mb-2" />
          )}
          <div className="rounded-lg border border-border/50 overflow-x-auto">
            <table className="w-full text-sm">
              <colgroup>
                {widths.map((w, i) => <col key={i} style={{ minWidth: w, width: w }} />)}
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
                      <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-32" /></td>
                      <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-16" /></td>
                      <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-24" /></td>
                      <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-8" /></td>
                      <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-16" /></td>
                      <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-12" /></td>
                    </tr>
                  ))
                ) : groupVMs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      Aucune VM trouvee
                    </td>
                  </tr>
                ) : (
                  groupVMs.map((vm) => (
                    <tr key={`${instanceId}-${vm.vm}`} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                      <td className="px-3 py-1.5 overflow-hidden text-xs font-medium text-foreground">
                        <span className="block truncate">{vm.name}</span>
                      </td>
                      <td className="px-3 py-1.5 overflow-hidden">
                        <StatusBadge
                          status={powerStateToStatus(vm.power_state)}
                          label={powerStateLabel(vm.power_state)}
                        />
                      </td>
                      <td className="px-3 py-1.5 overflow-hidden text-xs text-muted-foreground">
                        <span className="block truncate">
                          {vm.host
                            ? (hostNameMap.get(`${vm._instanceId ?? 'default'}:${vm.host}`) ?? vm.host)
                            : '\u2014'}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 overflow-hidden text-right text-xs text-muted-foreground">
                        <span className="block truncate">{vm.cpu_count} vCPU</span>
                      </td>
                      <td className="px-3 py-1.5 overflow-hidden text-right text-xs text-muted-foreground">
                        <span className="block truncate">{formatMemory(vm.memory_size_MiB)}</span>
                      </td>
                      <td className="px-3 py-1.5 overflow-hidden text-right">
                        {vcenterUrl && (
                          <ExternalLink
                            href={`${vcenterUrl}/ui/app/vm;nav=v/urn:vmomi:VirtualMachine:${vm.vm}`}
                            label="vSphere"
                            source="vcenter"
                          />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Show loading skeletons when no data yet */}
      {loading && !vms && instanceGroups.length === 0 && (
        <div className="rounded-lg border border-border/50 overflow-x-auto">
          <table className="w-full text-sm">
            <colgroup>
              {widths.map((w, i) => <col key={i} style={{ minWidth: w, width: w }} />)}
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
                  <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-32" /></td>
                  <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-16" /></td>
                  <td className="px-3 py-1.5"><Skeleton className="h-3.5 w-24" /></td>
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
