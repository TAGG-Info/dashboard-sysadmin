import { cn } from '@/lib/utils';

interface DatastoreBarProps {
  label: string;
  used: number;
  total: number;
  unit?: string;
  className?: string;
}

function getBarColor(percentage: number): string {
  if (percentage > 85) return '#ef4444';
  if (percentage > 70) return '#f59e0b';
  return '#10b981';
}

function formatSize(value: number, unit: string): string {
  if (unit === 'GB' && value >= 1024) {
    return `${(value / 1024).toFixed(1)} TB`;
  }
  return `${value.toFixed(1)} ${unit}`;
}

export function DatastoreBar({
  label,
  used,
  total,
  unit = 'GB',
  className,
}: DatastoreBarProps) {
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const color = getBarColor(percentage);

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground truncate mr-2">
          {label}
        </span>
        <span className="text-muted-foreground whitespace-nowrap">
          {formatSize(used, unit)} / {formatSize(total, unit)} ({Math.round(percentage)}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
