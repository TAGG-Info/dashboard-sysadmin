import { ExternalLink as ExternalLinkIcon, Globe } from 'lucide-react';

type SourceName = 'prtg' | 'vcenter' | 'proxmox' | 'veeam' | 'glpi' | 'securetransport';

interface ExternalLinkConfig {
  key: SourceName;
  label: string;
  color: string;
  url: string | undefined;
}

const linkConfigs: ExternalLinkConfig[] = [
  { key: 'prtg', label: 'PRTG', color: '#2196F3', url: process.env.NEXT_PUBLIC_PRTG_URL },
  { key: 'vcenter', label: 'VMware', color: '#4CAF50', url: process.env.NEXT_PUBLIC_VCENTER_URL },
  { key: 'proxmox', label: 'Proxmox', color: '#E87D0D', url: process.env.NEXT_PUBLIC_PROXMOX_URL },
  { key: 'veeam', label: 'Veeam', color: '#00B336', url: process.env.NEXT_PUBLIC_VEEAM_URL },
  { key: 'glpi', label: 'GLPI', color: '#FEC72D', url: process.env.NEXT_PUBLIC_GLPI_URL },
  { key: 'securetransport', label: 'ST', color: '#FF6D00', url: process.env.NEXT_PUBLIC_ST_URL },
];

export function ExternalLinks() {
  const configuredCount = linkConfigs.filter((c) => c.url).length;

  return (
    <div className="settings-card-glow bg-background shadow-card overflow-hidden rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
            <Globe className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-foreground text-base font-semibold tracking-wide">Liens externes</h3>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {configuredCount}/{linkConfigs.length} configures
            </p>
          </div>
        </div>
      </div>

      {/* Link Grid */}
      <div className="stagger-in grid grid-cols-2 gap-[1px] bg-white/[0.03]">
        {linkConfigs.map(({ key, label, color, url }) => {
          if (url) {
            return (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-background group relative flex flex-col gap-1.5 px-4 py-3.5 transition-all duration-200 hover:bg-white/[0.03]"
              >
                {/* Left accent */}
                <div
                  className="absolute top-2 bottom-2 left-0 w-[2px] rounded-full transition-all duration-200 group-hover:top-1 group-hover:bottom-1"
                  style={{
                    backgroundColor: color,
                    opacity: 0.5,
                    boxShadow: `0 0 8px ${color}30`,
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-foreground text-sm font-semibold">{label}</span>
                  <ExternalLinkIcon className="text-muted-foreground/30 group-hover:text-muted-foreground h-3 w-3 transition-colors" />
                </div>
                <span className="text-muted-foreground/60 group-hover:text-muted-foreground/90 truncate font-mono text-sm transition-colors">
                  {url.replace(/^https?:\/\//, '').split('/')[0]}
                </span>
              </a>
            );
          }

          return (
            <div key={key} className="bg-background relative flex flex-col gap-1.5 px-4 py-3.5">
              <div
                className="absolute top-2 bottom-2 left-0 w-[2px] rounded-full opacity-10"
                style={{ backgroundColor: '#6b7280' }}
              />
              <span className="text-muted-foreground/50 text-sm font-medium">{label}</span>
              <span className="text-muted-foreground/25 text-sm italic">Non configure</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
