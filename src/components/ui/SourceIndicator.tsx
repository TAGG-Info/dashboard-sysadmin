import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { SourceLogo } from '@/components/ui/SourceLogo';

type SourceName = 'prtg' | 'vcenter' | 'proxmox' | 'veeam' | 'glpi' | 'securetransport';

interface SourceIndicatorProps {
  source: SourceName;
  connected?: boolean;
  className?: string;
}

const sourceLabels: Record<SourceName, string> = {
  prtg: 'PRTG',
  vcenter: 'VMware',
  proxmox: 'Proxmox',
  veeam: 'Veeam',
  glpi: 'GLPI',
  securetransport: 'ST',
};

export function SourceIndicator({ source, connected, className }: SourceIndicatorProps) {
  const label = sourceLabels[source];
  const isConnected = connected === true;
  const isUnknown = connected === undefined;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('flex items-center gap-1.5 text-xs', className)}>
          <div className="relative">
            <SourceLogo source={source} size={14} colored={isConnected || isUnknown} />
            {!isUnknown && (
              <span
                className={cn(
                  'border-background absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border',
                  isConnected ? 'bg-emerald-500' : 'bg-red-500',
                )}
              />
            )}
          </div>
          <span className={cn('text-muted-foreground', !isConnected && !isUnknown && 'opacity-50')}>{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {label}: {isUnknown ? 'Statut inconnu' : isConnected ? 'Connecte' : 'Deconnecte'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
