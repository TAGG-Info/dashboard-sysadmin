import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

type SourceName = 'prtg' | 'vcenter' | 'proxmox' | 'veeam' | 'glpi' | 'securetransport';

interface SourceIndicatorProps {
  source: SourceName;
  connected?: boolean;
  className?: string;
}

const sourceConfig: Record<SourceName, { color: string; label: string }> = {
  prtg: { color: '#2196F3', label: 'PRTG' },
  vcenter: { color: '#4CAF50', label: 'VMware' },
  proxmox: { color: '#E87D0D', label: 'Proxmox' },
  veeam: { color: '#00B336', label: 'Veeam' },
  glpi: { color: '#FEC72D', label: 'GLPI' },
  securetransport: { color: '#FF6D00', label: 'ST' },
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
            'flex items-center gap-1.5 text-sm',
            className
          )}
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full shrink-0',
              !isConnected && !isUnknown && 'opacity-40'
            )}
            style={{
              backgroundColor: isUnknown
                ? '#6b7280'
                : isConnected
                  ? config.color
                  : '#6b7280',
            }}
          />
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
