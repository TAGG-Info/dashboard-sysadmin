'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MetricGauge } from '@/components/ui/MetricGauge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import type { ProxmoxNode } from '@/types/proxmox';

interface ProxmoxNodeCardProps {
  node: ProxmoxNode;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) {
    return `${days}j ${hours}h`;
  }
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function ProxmoxNodeCard({ node }: ProxmoxNodeCardProps) {
  // cpu is a 0-1 ratio from Proxmox API
  const cpuPercent = node.cpu * 100;
  const ramPercent = node.maxmem > 0 ? (node.mem / node.maxmem) * 100 : 0;
  const diskPercent = node.maxdisk > 0 ? (node.disk / node.maxdisk) * 100 : 0;

  const isOnline = node.status === 'online';
  const proxmoxUrl = process.env.NEXT_PUBLIC_PROXMOX_URL;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground text-base font-medium">{node.node}</CardTitle>
          <StatusBadge status={isOnline ? 'healthy' : 'critical'} label={isOnline ? 'Online' : 'Offline'} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isOnline && (
          <>
            <div className="flex items-center justify-center gap-4">
              <MetricGauge value={cpuPercent} label="CPU" size="sm" />
              <MetricGauge value={ramPercent} label="RAM" size="sm" />
              <MetricGauge value={diskPercent} label="Disk" size="sm" />
            </div>
            <div className="text-muted-foreground text-center text-sm">Uptime : {formatUptime(node.uptime)}</div>
          </>
        )}

        {proxmoxUrl && (
          <ExternalLink href={`${proxmoxUrl}/#v1:0:=node/${node.node}`} label="Proxmox" source="proxmox" />
        )}
      </CardContent>
    </Card>
  );
}
