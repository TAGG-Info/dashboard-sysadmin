import type { SourceName } from '@/types/common';
import { cn } from '@/lib/utils';

interface SourceLogoProps {
  source: SourceName;
  className?: string;
  size?: number;
  /** Use brand color (true) or currentColor (false). Default: true */
  colored?: boolean;
}

/**
 * PRTG Network Monitor — official multi-color radar/compass mark
 * Source: homarr-labs/dashboard-icons
 */
function PRTGLogo({ size, colored }: { size: number; colored: boolean }) {
  const orange = colored ? '#f99e1c' : 'currentColor';
  const blue = colored ? '#00397e' : 'currentColor';
  const pink = colored ? '#ee0f6a' : 'currentColor';
  const green = colored ? '#b4cc38' : 'currentColor';
  return (
    <svg width={size} height={size} viewBox="0 0 166.446 130.297" xmlns="http://www.w3.org/2000/svg">
      <path d="M106.062 69.168a83.2 83.2 0 0 0-56.58 22.273l14.058 15.972q-.68.449-1.345.914A58.04 58.04 0 0 1 95.47 97.841c18.162.001 34.756 8.441 45.516 22.037 8.307-9.191 16.743-18.52 23.854-26.386a83.2 83.2 0 0 0-58.777-24.324" fill={orange} transform="translate(-22.812 -69.168)" />
      <path d="m51.266 122.989 75.49 45.426-11.581 10.248z" fill={blue} transform="translate(-22.812 -69.168)" />
      <path d="m41.29 184.952-35.564.02c-2.142 12.892-8.613 24.66-18.29 33.441a58.04 58.04 0 0 1-23.945 13.03l6.203 31.806a83.13 83.13 0 0 0 44.338-20.686 83.2 83.2 0 0 0 27.262-57.61z" fill={pink} transform="rotate(-47.853 -89.352 -8.877)" />
      <path d="M49.493 91.451c-16.976 15.728-26.66 37.78-26.681 60.922.004 16.815 5.165 33.233 14.686 47.092l12.026-8.161c-7.83-10.147-12.138-22.6-12.147-35.417a58.05 58.05 0 0 1 26.173-48.465z" fill={green} transform="translate(-22.812 -69.168)" />
    </svg>
  );
}

/**
 * VMware vSphere — official overlapping rectangles icon
 * Source: homarr-labs/dashboard-icons
 */
function VMwareLogo({ size, colored }: { size: number; colored: boolean }) {
  const color = colored ? '#879AC3' : 'currentColor';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill={color} fillRule="evenodd" d="M5.574 0c-.959 0-1.728.754-1.728 1.68v5.744H1.728C.77 7.424 0 8.18 0 9.104v12.438c0 .926.77 1.68 1.728 1.68H14.58c.96 0 1.753-.754 1.753-1.68v-2.045h5.939c.958 0 1.728-.757 1.728-1.68V5.38c0-.924-.77-1.655-1.728-1.655h-2.118V1.68c0-.926-.771-1.68-1.728-1.68zm0 .95h12.852c.42 0 .755.323.755.73v2.044H9.42c-.957 0-1.753.731-1.753 1.655v2.045H4.82V1.68c0-.407.332-.73.755-.73m3.846 3.7h9.76v9.443a.76.76 0 0 1-.754.755h-2.093V9.103c0-.923-.794-1.68-1.753-1.68h-5.94V5.38c0-.406.36-.73.779-.73m10.734 0h2.118c.42 0 .754.323.754.73v12.437c0 .406-.334.73-.754.73h-5.94v-2.75h2.094c.957 0 1.728-.778 1.728-1.704zM1.728 8.372h2.118v5.72c0 .926.769 1.704 1.728 1.704h2.093v2.02c0 .923.796 1.68 1.753 1.68h5.939v2.045c0 .406-.356.73-.779.73H1.728a.735.735 0 0 1-.754-.73V9.103c0-.405.329-.73.754-.73m3.091 0h2.848v6.475H5.574a.757.757 0 0 1-.755-.755zm3.822 0h5.94c.422 0 .778.325.778.73v5.745H8.641zm0 7.424h6.718v2.75h-5.94c-.419 0-.778-.324-.778-.73z" />
    </svg>
  );
}

/**
 * Proxmox VE — official X/star mark
 * Source: homarr-labs/dashboard-icons
 */
function ProxmoxLogo({ size, colored }: { size: number; colored: boolean }) {
  const color = colored ? '#E57000' : 'currentColor';
  return (
    <svg width={size} height={size} viewBox="0 34 512 444" xmlns="http://www.w3.org/2000/svg">
      <path fill={color} d="M137.9 34.1c-10.5 0-19.7 1.9-28.5 5.7-8.6 3.8-16.2 8.9-22.9 15.6l170 186.4L426.1 55.3c-6.7-6.7-14.3-11.8-23.4-15.6-8.3-3.8-18-5.7-28-5.7-10.5 0-20.5 2.2-29.4 6.2-9.2 4-16.7 10-23.7 17l-65.2 72.2-66-72.2c-6.7-7-14.3-12.9-23.7-17-8.3-4-18.3-6.1-28.8-6.1M256.4 270l-170 186.7c6.7 6.5 14.3 11.8 22.9 15.6 8.9 3.8 18.1 5.7 28 5.7 11 0 20.5-2.4 29.4-6.2 9.4-4.3 17.5-10 24.2-17l65.5-72.2 65.4 72.2c6.7 7 14.3 12.7 23.4 17 8.9 3.8 18.6 6.2 29.4 6.2 10 0 19.7-1.9 28-5.7 9.2-3.8 16.7-9.2 23.4-15.6z" />
      <path fill={color} d="M56 90.1c-10.8.3-21.3 2.4-30.7 6.5-9.7 4-18 9.7-25.3 16.7L129.8 256 0 398.5c7.3 7.3 15.6 12.9 25.3 17.2 9.4 4.3 19.9 6.2 30.7 6.7 11.6-.5 22.4-2.4 32.3-7.3q15-6.9 25.8-18.6l128-140.5-127.9-140.3c-7.8-7.5-16.2-13.7-26.1-18.6-10-4.6-20.5-6.7-32.1-7m399.7 0c-11.6.3-21.8 2.4-31.8 7-10 4.8-18.6 11-26.1 18.6L270.4 256l127.4 140.6q11.25 11.7 26.1 18.6c10 4.8 20.2 6.7 31.8 7.3 11.6-.5 21.5-2.4 31-6.7 10.2-4.3 18-10 25.3-17.2L382.5 256 512 113.3c-7.3-7-15.1-12.7-25.3-16.7-9.4-4.1-19.4-6.2-31-6.5" />
    </svg>
  );
}

/**
 * Veeam Backup — official green corner + V mark
 * Source: homarr-labs/dashboard-icons
 */
function VeeamLogo({ size, colored }: { size: number; colored: boolean }) {
  const green = colored ? '#4caf50' : 'currentColor';
  const gray = colored ? '#90a4ae' : 'currentColor';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill={green} d="M6 6v24.75S6.093 42 17.25 42H42v-8H19s-8-.125-8-8V6z" />
      <path fill={gray} d="M15 6h6l7.5 18L36 6h6L32 30h-7z" />
    </svg>
  );
}

/**
 * GLPI — globe/swoosh extracted from official logo
 * Source: homarr-labs/dashboard-icons (globe portion only)
 */
function GLPILogo({ size, colored }: { size: number; colored: boolean }) {
  const color = colored ? '#00a5f3' : 'currentColor';
  return (
    <svg width={size} height={size} viewBox="-10 145 190 230" xmlns="http://www.w3.org/2000/svg">
      <path fill={color} opacity={colored ? 0.6 : 1} d="M128.5 308.4c-7.9-.6-15.7-2.3-23.1-4.9 19.7-11.1 33.1-27.1 38.2-49.3 1.4-6-2.7-9.1-7.8-11-10.2-3.8-21-4.2-31.8-4.6-5.4 0-10.8-.2-16.2-.8 16.4-7.2 33.7-12.3 51.4-15.1 9.1-1.8 18.6-1.8 27.7 0 12.6 3 19 12.8 16.1 25.4-4.5 19.5-19.1 31.5-33 43.9-6.6 6.1-14.3 11-21.5 16.4m-33.4 18.2-17.8-3.8c-.5 4.7-4.9 5.5-7.9 7.2-14.8 8.3-54.7 27.4-55.7 30.6 3 0 59.6-21.8 81.4-34" />
      <path fill={color} d="M104.1 176.7c19.2-7 39.1-8.9 59.3-8.8 4.9 0 9.3.8 9.6-6.4.3-6.6-2-9.3-8.8-9.7-19.5-1.1-39.1-.1-58.4 2.9-26.7 4-52.6 10.6-74.9 26.9C-2.5 206-10 252.8 14.2 286.4c5.3 7.4 12 13.7 19.6 18.7 13.3 8.5 28 14.5 43.4 17.7l17.8 3.8c22.3 2.1 44.6 3.9 67.1 1.9 7.4-.7 7.4-4.4 7.4-9.7.2-5.9-1.8-8.4-8.1-8.2-11.1.6-22.2-.1-33-2.2-7.9-.6-15.7-2.3-23.1-4.9-33.6-11.2-49.5-31.3-49.7-62.6-.1-30.9 16.3-52.4 48.5-64.2" />
    </svg>
  );
}

/**
 * Axway SecureTransport — official arrow/chevron mark
 * Source: vectorlogo.zone (transforms resolved)
 */
function SecureTransportLogo({ size, colored }: { size: number; colored: boolean }) {
  const color = colored ? '#D9272D' : 'currentColor';
  return (
    <svg width={size} height={size} viewBox="0 6 64 44" xmlns="http://www.w3.org/2000/svg">
      <path fill={color} d="M64.01,27.362V18.562L50.71,12.062v13.3l-50.7,-24.2v8.8l58,27.6v-13z" />
      <path fill={color} d="M13,33.7v8.8l9.4,4.4l-15.1,15.9h9.9l17.7,-18.7z" />
      <path fill={color} d="M58,42.1l-51,-24.5v8.8l40.6,19.5z" />
    </svg>
  );
}

const SOURCE_COLORS: Record<SourceName, string> = {
  prtg: '#f99e1c',
  vcenter: '#879AC3',
  proxmox: '#E57000',
  veeam: '#4caf50',
  glpi: '#00a5f3',
  securetransport: '#D9272D',
};

const LOGO_COMPONENTS: Record<SourceName, React.ComponentType<{ size: number; colored: boolean }>> = {
  prtg: PRTGLogo,
  vcenter: VMwareLogo,
  proxmox: ProxmoxLogo,
  veeam: VeeamLogo,
  glpi: GLPILogo,
  securetransport: SecureTransportLogo,
};

export function SourceLogo({ source, className, size = 18, colored = true }: SourceLogoProps) {
  const LogoComponent = LOGO_COMPONENTS[source];

  return (
    <span className={cn('inline-flex items-center justify-center shrink-0', className)}>
      <LogoComponent size={size} colored={colored} />
    </span>
  );
}

export { SOURCE_COLORS };
