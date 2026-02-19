import { SourceLogo } from '@/components/ui/SourceLogo';

type SourceName = 'prtg' | 'vcenter' | 'proxmox' | 'veeam' | 'glpi' | 'securetransport';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  source?: SourceName;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, source, badge, actions }: PageHeaderProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {source && <SourceLogo source={source} size={32} />}
          <div>
            <h1 className="text-foreground text-xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p>}
          </div>
          {badge}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="from-primary/30 via-primary/10 mt-3 h-px bg-gradient-to-r to-transparent" />
    </div>
  );
}
