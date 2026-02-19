'use client';

import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { InstanceSectionHeader, groupByInstance, hasMultipleInstances } from '@/components/ui/InstanceGroup';
import { useColumnResize } from '@/hooks/useColumnResize';
import { powerStateToStatus, powerStateLabel } from '@/lib/status-mappers';
import { formatMemory } from '@/lib/formatters';
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

export function VMList() {
  const { data: vms, loading, error, refresh } = useVCenterVMs();
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
    return groupByInstance(filteredVMs);
  }, [filteredVMs]);

  const multipleInstances = hasMultipleInstances(filteredVMs);

  const tableWidth = widths.reduce((a, b) => a + b, 0);

  if (error && !vms) {
    return <ErrorState title="Erreur VMware VMs" message={error.message} source="VMware" onRetry={refresh} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-sm font-semibold">
          Machines virtuelles
          {vms && (
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              ({filteredVMs.length}/{vms.length})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={resetWidths}
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            title="Reinitialiser la largeur des colonnes"
          >
            Reset colonnes
          </button>
          <Select value={filterPower} onValueChange={setFilterPower}>
            <SelectTrigger className="h-8 w-[140px] text-sm">
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

      {instanceGroups.map(({ instanceId, instanceName, items: groupVMs }) => (
        <div key={instanceId}>
          {multipleInstances && <InstanceSectionHeader instanceName={instanceName} className="mb-2" />}
          <div className="border-border/50 overflow-x-auto rounded-lg border">
            <table className="table-fixed text-sm" style={{ width: tableWidth }}>
              <colgroup>
                {widths.map((w, i) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-border/50 bg-muted/20 border-b">
                  {COLS.map((col, i) => {
                    const isLast = i === COLS.length - 1;
                    return (
                      <th
                        key={col.label}
                        className={`text-muted-foreground relative px-3 py-2 text-xs font-medium select-none text-${col.align}`}
                      >
                        <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{col.label}</span>
                        {!isLast && (
                          <div
                            onPointerDown={(e) => startResize(e, i)}
                            className="group absolute top-0 right-0 h-full w-1.5 cursor-col-resize"
                          >
                            <div className="bg-border/0 group-hover:bg-border/60 mx-auto h-full w-px transition-colors" />
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
                    <tr key={i} className="border-border/30 border-b">
                      <td className="px-3 py-1.5">
                        <Skeleton className="h-3.5 w-32" />
                      </td>
                      <td className="px-3 py-1.5">
                        <Skeleton className="h-3.5 w-16" />
                      </td>
                      <td className="px-3 py-1.5">
                        <Skeleton className="h-3.5 w-24" />
                      </td>
                      <td className="px-3 py-1.5">
                        <Skeleton className="h-3.5 w-8" />
                      </td>
                      <td className="px-3 py-1.5">
                        <Skeleton className="h-3.5 w-16" />
                      </td>
                      <td className="px-3 py-1.5">
                        <Skeleton className="h-3.5 w-12" />
                      </td>
                    </tr>
                  ))
                ) : groupVMs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground py-8 text-center text-sm">
                      Aucune VM trouvee
                    </td>
                  </tr>
                ) : (
                  groupVMs.map((vm) => (
                    <tr
                      key={`${instanceId}-${vm.vm}`}
                      className="border-border/30 hover:bg-muted/10 border-b transition-colors"
                    >
                      <td className="text-foreground overflow-hidden px-3 py-1.5 text-xs font-medium">
                        <span className="block truncate">{vm.name}</span>
                      </td>
                      <td className="overflow-hidden px-3 py-1.5">
                        <StatusBadge
                          status={powerStateToStatus(vm.power_state)}
                          label={powerStateLabel(vm.power_state)}
                        />
                      </td>
                      <td className="text-muted-foreground overflow-hidden px-3 py-1.5 text-xs">
                        <span className="block truncate">
                          {vm.host
                            ? (hostNameMap.get(`${vm._instanceId ?? 'default'}:${vm.host}`) ?? vm.host)
                            : '\u2014'}
                        </span>
                      </td>
                      <td className="text-muted-foreground overflow-hidden px-3 py-1.5 text-right text-xs">
                        <span className="block truncate">{vm.cpu_count} vCPU</span>
                      </td>
                      <td className="text-muted-foreground overflow-hidden px-3 py-1.5 text-right text-xs">
                        <span className="block truncate">{formatMemory(vm.memory_size_MiB)}</span>
                      </td>
                      <td className="overflow-hidden px-3 py-1.5 text-right">
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
        <div className="border-border/50 overflow-x-auto rounded-lg border">
          <table className="table-fixed text-sm" style={{ width: tableWidth }}>
            <colgroup>
              {widths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-border/50 bg-muted/20 border-b">
                {COLS.map((col) => (
                  <th
                    key={col.label}
                    className={`text-muted-foreground px-3 py-2 text-xs font-medium select-none text-${col.align}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-border/30 border-b">
                  <td className="px-3 py-1.5">
                    <Skeleton className="h-3.5 w-32" />
                  </td>
                  <td className="px-3 py-1.5">
                    <Skeleton className="h-3.5 w-16" />
                  </td>
                  <td className="px-3 py-1.5">
                    <Skeleton className="h-3.5 w-24" />
                  </td>
                  <td className="px-3 py-1.5">
                    <Skeleton className="h-3.5 w-8" />
                  </td>
                  <td className="px-3 py-1.5">
                    <Skeleton className="h-3.5 w-16" />
                  </td>
                  <td className="px-3 py-1.5">
                    <Skeleton className="h-3.5 w-12" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
