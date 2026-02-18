import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { SourceLogo } from '@/components/ui/SourceLogo';

type SourceName = 'prtg' | 'vcenter' | 'proxmox' | 'veeam' | 'glpi' | 'securetransport';

interface SourceIndicatorProps {
  source: SourceName;
  connected?: boolean;
  className?: string;
}

const sourceConfig: Record<SourceName, { color: string; label: string }> = {
  prtg: { color: '#3b82f6', label: 'PRTG' },
  vcenter: { color: '#22c55e', label: 'VMware' },
  proxmox: { color: '#f97316', label: 'Proxmox' },
  veeam: { color: '#22c55e', label: 'Veeam' },
  glpi: { color: '#f59e0b', label: 'GLPI' },
  securetransport: { color: '#f97316', label: 'ST' },
};

export function SourceIndicator({ source, connected, className }: SourceIndicatorProps) {
  const config = sourceConfig[source];
  const isConnected = connected === true;
  const isUnknown = connected === undefined;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs',
            className
          )}
        >
          <SourceLogo source={source} size={14} colored={isConnected || isUnknown} />
          <span
            className={cn(
              'text-muted-foreground',
              !isConnected && !isUnknown && 'line-through opacity-50'
            )}
          >
            {config.label}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {config.label}:{' '}
          {isUnknown
            ? 'Statut inconnu'
            : isConnected
              ? 'Connecte'
              : 'Deconnecte'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
