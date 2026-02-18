import { cn } from '@/lib/utils';

type StatusLevel = 'healthy' | 'warning' | 'critical' | 'info' | 'neutral' | 'new';

interface StatusBadgeProps {
  status: StatusLevel;
  label?: string;
  className?: string;
}

const statusConfig: Record<StatusLevel, { color: string; bg: string; label: string }> = {
  healthy: { color: '#10b981', bg: 'bg-[#10b981]/15', label: 'OK' },
  warning: { color: '#f59e0b', bg: 'bg-[#f59e0b]/15', label: 'Warning' },
  critical: { color: '#ef4444', bg: 'bg-[#ef4444]/15', label: 'Critical' },
  info: { color: '#3b82f6', bg: 'bg-[#3b82f6]/15', label: 'Info' },
  neutral: { color: '#6b7280', bg: 'bg-[#6b7280]/15', label: 'Pause' },
  new: { color: '#8b5cf6', bg: 'bg-[#8b5cf6]/15', label: 'Nouveau' },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-sm font-medium',
        config.bg,
        className
      )}
      style={{ color: config.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {label || config.label}
    </span>
  );
}
