import { SourceIndicator } from '@/components/ui/SourceIndicator';

type SourceName = 'prtg' | 'vcenter' | 'proxmox' | 'veeam' | 'glpi' | 'securetransport';

interface PageHeaderProps {
  title: string;
  source?: SourceName;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, source, badge, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {source && <SourceIndicator source={source} connected />}
        {badge}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
