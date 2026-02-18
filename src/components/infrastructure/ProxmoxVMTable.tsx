'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { InstanceSectionHeader } from '@/components/ui/InstanceGroup';
import { useProxmoxVMs } from '@/hooks/useInfrastructure';

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

export function ProxmoxVMTable() {
  const { data: vms, loading, error, refresh } = useProxmoxVMs();

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

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        VMs & Containers
        {vms && (
          <span className="ml-2 text-sm text-muted-foreground font-normal">
            ({vms.length})
          </span>
        )}
      </h3>

      {instanceGroups.map(([instanceId, { instanceName, items }]) => (
        <div key={instanceId}>
          {hasMultipleInstances && (
            <InstanceSectionHeader instanceName={instanceName} className="mb-2" />
          )}
          <div className="rounded-lg border border-border/50 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-sm">Type</TableHead>
                  <TableHead className="text-sm">Nom</TableHead>
                  <TableHead className="text-sm">Node</TableHead>
                  <TableHead className="text-sm">Etat</TableHead>
                  <TableHead className="text-sm text-right">CPU</TableHead>
                  <TableHead className="text-sm text-right">RAM</TableHead>
                  <TableHead className="text-sm text-right w-[80px]">Lien</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !vms ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      Aucune VM ou container
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((vm) => {
                    const isQemu = vm.type === 'qemu';
                    const typeLabel = isQemu ? 'VM' : 'CT';
                    const linkType = isQemu ? 'qemu' : 'lxc';

                    return (
                      <TableRow key={`${instanceId}-${vm.node}-${vm.type}-${vm.vmid}`}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              isQemu
                                ? 'text-[#E87D0D] border-[#E87D0D]/30 text-sm'
                                : 'text-[#3b82f6] border-[#3b82f6]/30 text-sm'
                            }
                          >
                            {typeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{vm.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{vm.node}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={vmStatusToLevel(vm.status)}
                            label={vmStatusLabel(vm.status)}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-right text-muted-foreground">
                          {vm.cpus} vCPU
                        </TableCell>
                        <TableCell className="text-sm text-right text-muted-foreground">
                          {vm.status === 'running' && vm.mem > 0
                            ? `${formatBytes(vm.mem)} / ${formatBytes(vm.maxmem)}`
                            : formatBytes(vm.maxmem)}
                        </TableCell>
                        <TableCell className="text-right">
                          {proxmoxUrl && (
                            <ExternalLink
                              href={`${proxmoxUrl}/#v1:0:=${linkType}/${vm.vmid}`}
                              label="Proxmox"
                              source="proxmox"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}

      {/* Show loading skeletons when no data */}
      {loading && !vms && instanceGroups.length === 0 && (
        <div className="rounded-lg border border-border/50 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-sm">Type</TableHead>
                <TableHead className="text-sm">Nom</TableHead>
                <TableHead className="text-sm">Node</TableHead>
                <TableHead className="text-sm">Etat</TableHead>
                <TableHead className="text-sm text-right">CPU</TableHead>
                <TableHead className="text-sm text-right">RAM</TableHead>
                <TableHead className="text-sm text-right w-[80px]">Lien</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
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
