'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useVCenterVMs, useVCenterHosts } from '@/hooks/useInfrastructure';

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

export function VMList() {
  const { data: vms, loading, error, refresh } = useVCenterVMs();
  const { data: hosts } = useVCenterHosts();
  const [filterPower, setFilterPower] = useState<string>('all');

  const vcenterUrl = process.env.NEXT_PUBLIC_VCENTER_URL;

  // Map "instanceId:hostId" → hostName for display
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
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-sm">Nom</TableHead>
                  <TableHead className="text-sm">Etat</TableHead>
                  <TableHead className="text-sm">Host</TableHead>
                  <TableHead className="text-sm text-right">CPU</TableHead>
                  <TableHead className="text-sm text-right">RAM</TableHead>
                  <TableHead className="text-sm text-right w-[80px]">Lien</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !vms ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    </TableRow>
                  ))
                ) : groupVMs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      Aucune VM trouvee
                    </TableCell>
                  </TableRow>
                ) : (
                  groupVMs.map((vm) => (
                    <TableRow key={`${instanceId}-${vm.vm}`}>
                      <TableCell className="text-sm font-medium">{vm.name}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={powerStateToStatus(vm.power_state)}
                          label={powerStateLabel(vm.power_state)}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {vm.host
                          ? (hostNameMap.get(`${vm._instanceId ?? 'default'}:${vm.host}`) ?? vm.host)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-right text-muted-foreground">
                        {vm.cpu_count} vCPU
                      </TableCell>
                      <TableCell className="text-sm text-right text-muted-foreground">
                        {formatMemory(vm.memory_size_MiB)}
                      </TableCell>
                      <TableCell className="text-right">
                        {vcenterUrl && (
                          <ExternalLink
                            href={`${vcenterUrl}/ui/app/vm;nav=v/urn:vmomi:VirtualMachine:${vm.vm}`}
                            label="vSphere"
                            source="vcenter"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}

      {/* Show loading skeletons when no data yet */}
      {loading && !vms && instanceGroups.length === 0 && (
        <div className="rounded-lg border border-border/50 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-sm">Nom</TableHead>
                <TableHead className="text-sm">Etat</TableHead>
                <TableHead className="text-sm">Host</TableHead>
                <TableHead className="text-sm text-right">CPU</TableHead>
                <TableHead className="text-sm text-right">RAM</TableHead>
                <TableHead className="text-sm text-right w-[80px]">Lien</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
