import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SourceConfigs } from '@/components/settings/SourceConfigs';
import { HealthChecks } from '@/components/settings/HealthChecks';
import { RefreshSettings } from '@/components/settings/RefreshSettings';
import { ExternalLinks } from '@/components/settings/ExternalLinks';
import { RoleManager } from '@/components/settings/RoleManager';
import { PageHeader } from '@/components/layout/PageHeader';

export default function SettingsPage() {
  return (
    <div className="space-y-6" style={{ zoom: 1.15 }}>
      <PageHeader
        title="Parametres"
        badge={
          <Badge className="h-6 gap-1.5 border-amber-500/20 bg-amber-500/10 px-2.5 text-sm font-semibold text-amber-400">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        }
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Source Configuration + Roles */}
        <div className="space-y-6">
          <SourceConfigs />
          <RoleManager />
        </div>

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
