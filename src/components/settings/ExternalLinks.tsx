import { ExternalLink as ExternalLinkIcon, Globe } from 'lucide-react';

type SourceName = 'prtg' | 'vcenter' | 'proxmox' | 'veeam' | 'glpi' | 'securetransport';

interface ExternalLinkConfig {
  key: SourceName;
  label: string;
  url: string | undefined;
}

const linkConfigs: ExternalLinkConfig[] = [
  { key: 'prtg', label: 'PRTG', url: process.env.NEXT_PUBLIC_PRTG_URL },
  { key: 'vcenter', label: 'VMware', url: process.env.NEXT_PUBLIC_VCENTER_URL },
  { key: 'proxmox', label: 'Proxmox', url: process.env.NEXT_PUBLIC_PROXMOX_URL },
  { key: 'veeam', label: 'Veeam', url: process.env.NEXT_PUBLIC_VEEAM_URL },
  { key: 'glpi', label: 'GLPI', url: process.env.NEXT_PUBLIC_GLPI_URL },
  { key: 'securetransport', label: 'ST', url: process.env.NEXT_PUBLIC_ST_URL },
];

export function ExternalLinks() {
  const configuredCount = linkConfigs.filter((c) => c.url).length;

  return (
    <div className="bg-card border-border overflow-hidden rounded-lg border">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
            <Globe className="text-muted-foreground h-4 w-4" />
          </div>
          <div>
            <h3 className="text-foreground text-sm font-semibold">Liens externes</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {configuredCount}/{linkConfigs.length} configures
            </p>
          </div>
        </div>
      </div>

      {/* Link Grid */}
      <div className="stagger-in bg-border grid grid-cols-2 gap-px">
        {linkConfigs.map(({ key, label, url }) => {
          if (url) {
            return (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-card group hover:bg-accent flex flex-col gap-1.5 px-4 py-3.5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-foreground text-sm font-medium">{label}</span>
                  <ExternalLinkIcon className="text-muted-foreground/30 group-hover:text-muted-foreground h-3 w-3 transition-colors" />
                </div>
                <span className="text-muted-foreground/60 group-hover:text-muted-foreground truncate font-mono text-xs transition-colors">
                  {url.replace(/^https?:\/\//, '').split('/')[0]}
                </span>
              </a>
            );
          }

          return (
            <div key={key} className="bg-card flex flex-col gap-1.5 px-4 py-3.5">
              <span className="text-muted-foreground/50 text-sm font-medium">{label}</span>
              <span className="text-muted-foreground/25 text-xs italic">Non configure</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
