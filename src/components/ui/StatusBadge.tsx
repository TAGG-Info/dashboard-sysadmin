import { cn } from '@/lib/utils';

type StatusLevel = 'healthy' | 'warning' | 'critical' | 'info' | 'neutral' | 'new';

interface StatusBadgeProps {
  status: StatusLevel;
  label?: string;
  className?: string;
}

const statusConfig: Record<StatusLevel, { color: string; bg: string; label: string }> = {
  healthy: { color: '#22c55e', bg: 'bg-[#22c55e]/12', label: 'Healthy' },
  warning: { color: '#f59e0b', bg: 'bg-[#f59e0b]/12', label: 'Warning' },
  critical: { color: '#ef4444', bg: 'bg-[#ef4444]/12', label: 'Critical' },
  info: { color: '#3b82f6', bg: 'bg-[#3b82f6]/12', label: 'Info' },
  neutral: { color: '#6b7280', bg: 'bg-[#6b7280]/12', label: 'Pause' },
  new: { color: '#8b5cf6', bg: 'bg-[#8b5cf6]/12', label: 'Nouveau' },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
        config.bg,
        className
      )}
      style={{ color: config.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: config.color }}
      />
      {label || config.label}
    </span>
  );
}
