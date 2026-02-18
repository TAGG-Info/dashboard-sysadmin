import { Shield, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SourceConfigs } from '@/components/settings/SourceConfigs';
import { HealthChecks } from '@/components/settings/HealthChecks';
import { RefreshSettings } from '@/components/settings/RefreshSettings';
import { ExternalLinks } from '@/components/settings/ExternalLinks';

export default function SettingsPage() {
  return (
    <div className="relative">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 border border-primary/20">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Parametres</h1>
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1.5 text-sm h-6 px-2.5 font-semibold">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Configuration des sources de donnees et parametres systeme
              </p>
            </div>
          </div>
          {/* Separator with gradient */}
          <div className="mt-6 h-[1px] bg-gradient-to-r from-primary/10 via-border/30 to-transparent" />
        </div>

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
    </div>
  );
}
