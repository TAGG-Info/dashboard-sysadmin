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

/** French date + time on separate lines (e.g. "Jeu. 19 fév. 2026" / "10:33:58") */
export function formatDateTimeFR(dateStr: string): { date: string; time: string } {
  try {
    const d = typeof dateStr === 'string' && dateStr.includes('T') ? parseISO(dateStr) : new Date(dateStr);
    const raw = format(d, 'EEE d MMM yyyy', { locale: fr });
    // Capitalize first letter: "jeu. 19 fév. 2026" → "Jeu. 19 fév. 2026"
    const date = raw.charAt(0).toUpperCase() + raw.slice(1);
    return { date, time: format(d, 'HH:mm:ss', { locale: fr }) };
  } catch {
    return { date: dateStr, time: '' };
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
