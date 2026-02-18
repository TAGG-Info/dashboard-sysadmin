import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SourceConfigs } from '@/components/settings/SourceConfigs';
import { HealthChecks } from '@/components/settings/HealthChecks';
import { RefreshSettings } from '@/components/settings/RefreshSettings';
import { ExternalLinks } from '@/components/settings/ExternalLinks';
import { PageHeader } from '@/components/layout/PageHeader';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Parametres"
        badge={
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1.5 text-sm h-6 px-2.5 font-semibold">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        }
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Source Configuration */}
        <SourceConfigs />

        {/* Right: Health, Refresh, Links (sticky) */}
        <div className="space-y-5 lg:sticky lg:top-4 lg:self-start">
          <HealthChecks />
          <RefreshSettings />
          <ExternalLinks />
        </div>
      </div>
    </div>
  );
}
