'use client';

import { useVCenterHosts, useProxmoxNodes } from '@/hooks/useInfrastructure';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { SourceLogo } from '@/components/ui/SourceLogo';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatMemory, formatBytes } from '@/lib/formatters';

type StatusLevel = 'healthy' | 'warning' | 'critical' | 'info' | 'neutral' | 'new';

function gaugeColor(pct: number): string {
  if (pct > 80) return '#ef4444';
  if (pct >= 60) return '#f59e0b';
  return '#3b82f6';
}

function MiniGauge({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex items-center gap-1 text-[11px]">
      <span className="text-muted-foreground min-w-[24px] font-semibold">{label}</span>
      <div className="bg-secondary h-1.5 w-12 overflow-hidden rounded-sm">
        <div
          className="h-full rounded-sm"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: gaugeColor(pct) }}
        />
      </div>
      <span className="text-secondary-foreground min-w-[30px] font-bold">{Math.round(pct)}%</span>
    </div>
  );
}

function connectionToStatus(state: string): StatusLevel {
  if (state === 'CONNECTED') return 'healthy';
  if (state === 'NOT_RESPONDING') return 'warning';
  return 'critical';
}

function nodeStatusToLevel(status: string): StatusLevel {
  return status === 'online' ? 'healthy' : 'critical';
}

export function DashboardHypervisor() {
  const { data: hosts, loading: hLoading, error: hError, refresh: hRefresh } = useVCenterHosts();
  const { data: nodes, loading: nLoading, error: nError, refresh: nRefresh } = useProxmoxNodes();

  const loading = hLoading && !hosts && nLoading && !nodes;
  const allError = hError && nError && !hosts && !nodes;

  if (allError) {
    return (
      <ErrorState
        title="Hyperviseurs indisponibles"
        source="vCenter / Proxmox"
        onRetry={() => {
          hRefresh();
          nRefresh();
        }}
      />
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hostList = hosts ?? [];
  const nodeList = nodes ?? [];

  const totalVMs = hostList.reduce((s, h) => s + (h.vm_count ?? 0), 0);
  const connectedHosts = hostList.filter((h) => h.connection_state === 'CONNECTED').length;
  const onlineNodes = nodeList.filter((n) => n.status === 'online').length;

  return (
    <Card>
      <CardContent className="p-4">
        <Tabs defaultValue="vcenter">
          <TabsList className="mb-3 h-8">
            <TabsTrigger value="vcenter" className="gap-1.5 text-xs">
              <SourceLogo source="vcenter" size={14} />
              vCenter
            </TabsTrigger>
            <TabsTrigger value="proxmox" className="gap-1.5 text-xs">
              <SourceLogo source="proxmox" size={14} />
              Proxmox
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vcenter">
            {hError && !hosts ? (
              <p className="text-muted-foreground py-4 text-center text-sm">vCenter indisponible</p>
            ) : (
              <>
                {hostList.map((h) => (
                  <div key={h.host} className="border-border/60 border-b py-2 last:border-b-0">
                    <div className="mb-0.5 flex items-center gap-1.5">
                      <span className="text-foreground text-sm font-semibold">{h.name}</span>
                      <StatusBadge
                        status={connectionToStatus(h.connection_state)}
                        label={
                          h.connection_state === 'CONNECTED'
                            ? 'Connected'
                            : h.connection_state === 'NOT_RESPONDING'
                              ? 'Warning'
                              : 'Disconnected'
                        }
                      />
                    </div>
                    <div className="text-secondary-foreground text-xs">
                      {h.vm_count ?? 0} VMs &middot; {h.cpu_count ?? 0} vCPU &middot;{' '}
                      {h.memory_size_MiB ? formatMemory(h.memory_size_MiB) : '?'} RAM
                    </div>
                  </div>
                ))}
                <div className="text-muted-foreground border-border/60 mt-2 border-t pt-2 text-xs">
                  <strong className="text-foreground">{totalVMs}</strong> VMs &middot;{' '}
                  <strong className="text-foreground">{hostList.length}</strong> hosts &middot;{' '}
                  <span className="text-emerald-400">
                    {connectedHosts}/{hostList.length} connected
                  </span>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="proxmox">
            {nError && !nodes ? (
              <p className="text-muted-foreground py-4 text-center text-sm">Proxmox indisponible</p>
            ) : (
              <>
                {nodeList.map((n) => {
                  const cpuPct = n.cpu * 100;
                  const ramPct = (n.mem / n.maxmem) * 100;
                  const diskPct = (n.disk / n.maxdisk) * 100;
                  return (
                    <div key={n.node} className="border-border/60 border-b py-2 last:border-b-0">
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <span className="text-foreground text-sm font-semibold">{n.node}</span>
                        <StatusBadge
                          status={nodeStatusToLevel(n.status)}
                          label={n.status === 'online' ? 'Online' : 'Offline'}
                        />
                      </div>
                      <div className="text-secondary-foreground text-xs">
                        CPU {Math.round(cpuPct)}% &middot; {formatBytes(n.mem)}/{formatBytes(n.maxmem)} RAM &middot;{' '}
                        {formatBytes(n.disk)}/{formatBytes(n.maxdisk)} Disk
                      </div>
                      <div className="mt-1 flex gap-2.5">
                        <MiniGauge label="CPU" pct={cpuPct} />
                        <MiniGauge label="RAM" pct={ramPct} />
                        <MiniGauge label="Disk" pct={diskPct} />
                      </div>
                    </div>
                  );
                })}
                <div className="text-muted-foreground border-border/60 mt-2 border-t pt-2 text-xs">
                  <strong className="text-foreground">{nodeList.length}</strong> nodes &middot;{' '}
                  <span className="text-emerald-400">
                    {onlineNodes}/{nodeList.length} online
                  </span>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
