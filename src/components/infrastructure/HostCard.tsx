'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import type { VCenterHost } from '@/types/vcenter';

interface HostCardProps {
  host: VCenterHost;
}

function connectionStateToStatus(state: string): 'healthy' | 'warning' | 'critical' | 'neutral' {
  switch (state.toUpperCase()) {
    case 'CONNECTED':
      return 'healthy';
    case 'DISCONNECTED':
      return 'critical';
    case 'NOT_RESPONDING':
      return 'warning';
    default:
      return 'neutral';
  }
}

function connectionStateLabel(state: string): string {
  switch (state.toUpperCase()) {
    case 'CONNECTED':
      return 'Connecte';
    case 'DISCONNECTED':
      return 'Deconnecte';
    case 'NOT_RESPONDING':
      return 'Ne repond pas';
    default:
      return state;
  }
}

export function HostCard({ host }: HostCardProps) {
  const vcenterUrl = process.env.NEXT_PUBLIC_VCENTER_URL;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground text-base font-medium">{host.name}</CardTitle>
          <StatusBadge
            status={connectionStateToStatus(host.connection_state)}
            label={connectionStateLabel(host.connection_state)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <span>{host.vm_count ?? 0} VMs</span>
          <span className="text-muted-foreground/50">|</span>
          <span>{host.running_vm_count ?? 0} actives</span>
        </div>
        {(host.cpu_count !== undefined || host.memory_size_MiB !== undefined) && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            {host.cpu_count !== undefined && <span>{host.cpu_count} CPU</span>}
            {host.cpu_count !== undefined && host.memory_size_MiB !== undefined && (
              <span className="text-muted-foreground/50">|</span>
            )}
            {host.memory_size_MiB !== undefined && <span>{(host.memory_size_MiB / 1024).toFixed(0)} Go RAM</span>}
          </div>
        )}

        {vcenterUrl && (
          <ExternalLink
            href={`${vcenterUrl}/ui/app/host;nav=h/urn:vmomi:HostSystem:${host.host}`}
            label="vSphere"
            source="vcenter"
          />
        )}
      </CardContent>
    </Card>
  );
}
