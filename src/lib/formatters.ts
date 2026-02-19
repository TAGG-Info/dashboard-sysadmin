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
    if (isNaN(d.getTime())) return { date: dateStr, time: '' };
    const raw = d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return {
      date: raw.charAt(0).toUpperCase() + raw.slice(1),
      time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
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
