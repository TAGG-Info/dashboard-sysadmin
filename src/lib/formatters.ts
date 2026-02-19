import { format, parseISO, formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

// From TransferLogTable.tsx
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// From VMList.tsx
export function formatMemory(mib: number): string {
  const gb = mib / 1024;
  if (gb >= 1) {
    return `${gb.toFixed(1)} Go`;
  }
  return `${mib} MiB`;
}

export function formatDateFR(dateStr: string): string {
  try {
    const date = typeof dateStr === 'string' && dateStr.includes('T') ? parseISO(dateStr) : new Date(dateStr);
    return format(date, 'dd/MM HH:mm:ss', { locale: fr });
  } catch {
    return dateStr;
  }
}

export function formatTimeAgo(dateStr: string): string {
  try {
    const date = typeof dateStr === 'string' && dateStr.includes('T') ? parseISO(dateStr) : new Date(dateStr);
    return formatDistance(date, new Date(), { addSuffix: true, locale: fr });
  } catch {
    return dateStr;
  }
}
