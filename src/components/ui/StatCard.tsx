import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  subtitle?: string;
}

export function StatCard({ label, value, color, icon, badge, trend, subtitle }: StatCardProps) {
  if (icon) {
    return (
      <Card className="border-t-2 transition-colors" style={{ borderTopColor: color ?? 'var(--color-primary)' }}>
        <CardContent className="flex items-center gap-3 p-4 2xl:p-5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-md"
            style={{
              backgroundColor: color ? `${color}18` : 'var(--color-primary-alpha-10, oklch(0.72 0.19 155 / 0.1))',
            }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground truncate text-xs">{label}</p>
            <p className="text-foreground text-3xl font-bold tabular-nums">{value}</p>
            {trend && (
              <span
                className={cn(
                  'mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium',
                  trend.positive ? 'bg-[#22c55e]/12 text-[#22c55e]' : 'bg-[#ef4444]/12 text-[#ef4444]',
                )}
              >
                {trend.positive ? '\u2197' : '\u2198'} {trend.value}
              </span>
            )}
            {subtitle && <p className="text-muted-foreground mt-0.5 text-[11px]">{subtitle}</p>}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-t-2 transition-colors" style={{ borderTopColor: color ?? 'var(--color-primary)' }}>
      <CardContent className="p-4 2xl:p-5">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums" style={color ? { color } : undefined}>
          {value}
        </p>
        {trend && (
          <span
            className={cn(
              'mt-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium',
              trend.positive ? 'bg-[#22c55e]/12 text-[#22c55e]' : 'bg-[#ef4444]/12 text-[#ef4444]',
            )}
          >
            {trend.positive ? '\u2197' : '\u2198'} {trend.value}
          </span>
        )}
        {badge}
      </CardContent>
    </Card>
  );
}
