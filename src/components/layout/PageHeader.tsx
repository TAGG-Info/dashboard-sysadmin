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
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {source && <SourceLogo source={source} size={28} />}
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {badge}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
