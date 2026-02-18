import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type SourceName = 'prtg' | 'vcenter' | 'proxmox' | 'veeam' | 'glpi' | 'securetransport';

interface ExternalLinkProps {
  href: string;
  label: string;
  source?: SourceName;
  className?: string;
}

const sourceColors: Record<SourceName, string> = {
  prtg: '#2196F3',
  vcenter: '#4CAF50',
  proxmox: '#E87D0D',
  veeam: '#00B336',
  glpi: '#FEC72D',
  securetransport: '#FF6D00',
};

export function ExternalLink({ href, label, source, className }: ExternalLinkProps) {
  const color = source ? sourceColors[source] : undefined;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80',
        !source && 'text-primary',
        className
      )}
      style={color ? { color } : undefined}
    >
      {label}
      <ExternalLinkIcon className="h-3 w-3" />
    </a>
  );
}
