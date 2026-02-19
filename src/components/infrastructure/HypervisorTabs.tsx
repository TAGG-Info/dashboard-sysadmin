'use client';

import { useMemo, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SourceIndicator } from '@/components/ui/SourceIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { InstanceSectionHeader } from '@/components/ui/InstanceGroup';
import { HostCard } from './HostCard';
import { VMList } from './VMList';
import { DatastoreList } from './DatastoreList';
import { ProxmoxNodeCard } from './ProxmoxNodeCard';
import { ProxmoxVMTable } from './ProxmoxVMTable';
import { useVCenterHosts, useProxmoxNodes } from '@/hooks/useInfrastructure';

function groupByInstanceId<T extends { _instanceId?: string; _instanceName?: string }>(
  items: T[],
): { instanceId: string; instanceName: string; items: T[] }[] {
  const map = new Map<string, { instanceName: string; items: T[] }>();
  for (const item of items) {
    const id = item._instanceId ?? 'default';
    const name = item._instanceName ?? '';
    if (!map.has(id)) {
      map.set(id, { instanceName: name, items: [] });
    }
    map.get(id)!.items.push(item);
  }
  return Array.from(map.entries()).map(([instanceId, { instanceName, items }]) => ({
    instanceId,
    instanceName,
    items,
  }));
}

export function HypervisorTabs({ refreshSignal }: { refreshSignal?: number }) {
  const { data: hosts, loading: hostsLoading, error: hostsError, refresh: refreshHosts } = useVCenterHosts();
  const { data: nodes, loading: nodesLoading, error: nodesError, refresh: refreshNodes } = useProxmoxNodes();

  const refreshHostsRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const refreshNodesRef = useRef<(() => Promise<void>) | undefined>(undefined);
  // eslint-disable-next-line react-hooks/refs
  refreshHostsRef.current = refreshHosts;
  // eslint-disable-next-line react-hooks/refs
  refreshNodesRef.current = refreshNodes;
  useEffect(() => {
    if (refreshSignal) {
      refreshHostsRef.current?.();
      refreshNodesRef.current?.();
    }
  }, [refreshSignal]);

  const hostGroups = useMemo(() => {
    if (!hosts) return [];
    return groupByInstanceId(hosts);
  }, [hosts]);

  const nodeGroups = useMemo(() => {
    if (!nodes) return [];
    return groupByInstanceId(nodes);
  }, [nodes]);

  const multipleVCenterInstances = hostGroups.length > 1;
  const multipleProxmoxInstances = nodeGroups.length > 1;

  return (
    <Tabs defaultValue="vmware" className="space-y-4">
      <TabsList>
        <TabsTrigger value="vmware" className="gap-2">
          <SourceIndicator source="vcenter" connected={!hostsError} />
        </TabsTrigger>
        <TabsTrigger value="proxmox" className="gap-2">
          <SourceIndicator source="proxmox" connected={!nodesError} />
        </TabsTrigger>
      </TabsList>

      {/* VMware Tab */}
      <TabsContent value="vmware" className="space-y-6">
        {/* Hosts Grid */}
        <div>
          <h3 className="text-foreground mb-3 text-sm font-semibold">
            Hosts ESXi
            {hosts && <span className="text-muted-foreground ml-2 text-sm font-normal">({hosts.length})</span>}
          </h3>
          {hostsError && !hosts ? (
            <ErrorState
              title="Erreur VMware Hosts"
              message={hostsError.message}
              source="VMware"
              onRetry={refreshHosts}
            />
          ) : hostsLoading && !hosts ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border-border/50 space-y-3 rounded-lg border p-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          ) : hosts && hosts.length > 0 ? (
            <div className="space-y-4">
              {hostGroups.map((group) => (
                <div key={group.instanceId}>
                  {multipleVCenterInstances && (
                    <InstanceSectionHeader instanceName={group.instanceName} className="mb-2" />
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                    {group.items.map((host) => (
                      <HostCard key={`${group.instanceId}-${host.host}`} host={host} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Aucun host ESXi</p>
          )}
        </div>

        {/* VM List + Datastores side by side */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-[3fr_2fr]">
          <VMList refreshSignal={refreshSignal} />
          <DatastoreList key={refreshSignal} />
        </div>
      </TabsContent>

      {/* Proxmox Tab */}
      <TabsContent value="proxmox" className="space-y-6">
        {/* Nodes Grid */}
        <div>
          <h3 className="text-foreground mb-3 text-sm font-semibold">
            Nodes
            {nodes && <span className="text-muted-foreground ml-2 text-sm font-normal">({nodes.length})</span>}
          </h3>
          {nodesError && !nodes ? (
            <ErrorState
              title="Erreur Proxmox Nodes"
              message={nodesError.message}
              source="Proxmox"
              onRetry={refreshNodes}
            />
          ) : nodesLoading && !nodes ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="border-border/50 space-y-3 rounded-lg border p-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : nodes && nodes.length > 0 ? (
            <div className="space-y-4">
              {nodeGroups.map((group) => (
                <div key={group.instanceId}>
                  {multipleProxmoxInstances && (
                    <InstanceSectionHeader instanceName={group.instanceName} className="mb-2" />
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                    {group.items.map((node) => (
                      <ProxmoxNodeCard key={`${group.instanceId}-${node.node}`} node={node} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Aucun node Proxmox</p>
          )}
        </div>

        {/* Proxmox VM Table */}
        <ProxmoxVMTable refreshSignal={refreshSignal} />
      </TabsContent>
    </Tabs>
  );
}
