import type { SourceName } from '@/types/common';
import { cn } from '@/lib/utils';

interface SourceLogoProps {
  source: SourceName;
  className?: string;
  size?: number;
  /** Use brand color (true) or currentColor (false). Default: true */
  colored?: boolean;
}

/** PRTG Network Monitor (Paessler) — simplified eye/gauge icon */
function PRTGLogo({ size, color }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4C7 4 2.73 7.11 1 11.5C2.73 15.89 7 19 12 19C17 19 21.27 15.89 23 11.5C21.27 7.11 17 4 12 4Z" stroke={color || 'currentColor'} strokeWidth="1.8" fill="none" />
      <circle cx="12" cy="11.5" r="3.5" fill={color || 'currentColor'} />
    </svg>
  );
}

/** VMware vCenter — layered diamond */
function VMwareLogo({ size, color }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke={color || 'currentColor'} strokeWidth="1.5" fill="none" />
      <path d="M12 6L18 12L12 18L6 12L12 6Z" fill={color || 'currentColor'} opacity="0.3" />
      <path d="M12 9L15 12L12 15L9 12L12 9Z" fill={color || 'currentColor'} />
    </svg>
  );
}

/** Proxmox VE — hexagonal P shape */
function ProxmoxLogo({ size, color }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke={color || 'currentColor'} strokeWidth="1.5" fill={color || 'currentColor'} fillOpacity="0.1" />
      <path d="M9 8V16M9 8H13.5C15.43 8 17 9.34 17 11C17 12.66 15.43 14 13.5 14H9" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Veeam Backup & Replication — V checkmark */
function VeeamLogo({ size, color }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6L12 20L21 6" stroke={color || 'currentColor'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M7 6L12 15L17 6" stroke={color || 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.4" />
    </svg>
  );
}

/** GLPI — simplified gear with 6 teeth */
function GLPILogo({ size, color }: { size: number; color?: string }) {
  const c = color || 'currentColor';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" fill={c} />
      <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="7" stroke={c} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** Axway SecureTransport — shield with lock */
function SecureTransportLogo({ size, color }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L3 7V12C3 17.25 6.75 21.75 12 23C17.25 21.75 21 17.25 21 12V7L12 2Z" stroke={color || 'currentColor'} strokeWidth="1.5" strokeLinejoin="round" fill={color || 'currentColor'} fillOpacity="0.1" />
      <rect x="9" y="11" width="6" height="5" rx="1" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <path d="M10 11V9C10 7.9 10.9 7 12 7C13.1 7 14 7.9 14 9V11" stroke={color || 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const SOURCE_COLORS: Record<SourceName, string> = {
  prtg: '#2196F3',
  vcenter: '#4CAF50',
  proxmox: '#E87D0D',
  veeam: '#00B336',
  glpi: '#FEC72D',
  securetransport: '#FF6D00',
};

const LOGO_COMPONENTS: Record<SourceName, React.ComponentType<{ size: number; color?: string }>> = {
  prtg: PRTGLogo,
  vcenter: VMwareLogo,
  proxmox: ProxmoxLogo,
  veeam: VeeamLogo,
  glpi: GLPILogo,
  securetransport: SecureTransportLogo,
};

export function SourceLogo({ source, className, size = 18, colored = true }: SourceLogoProps) {
  const LogoComponent = LOGO_COMPONENTS[source];
  const color = colored ? SOURCE_COLORS[source] : undefined;

  return (
    <span className={cn('inline-flex items-center justify-center shrink-0', className)}>
      <LogoComponent size={size} color={color} />
    </span>
  );
}

export { SOURCE_COLORS };
