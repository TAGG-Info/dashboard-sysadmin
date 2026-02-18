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
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: color ? `${color}15` : undefined }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 mt-1 rounded px-1.5 py-0.5 text-[11px] font-medium',
                  trend.positive
                    ? 'bg-[#22c55e]/12 text-[#22c55e]'
                    : 'bg-[#ef4444]/12 text-[#ef4444]'
                )}
              >
                {trend.positive ? '\u2197' : '\u2198'} {trend.value}
              </span>
            )}
            {subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold mt-0.5" style={color ? { color } : undefined}>
          {value}
        </p>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 mt-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium',
              trend.positive
                ? 'bg-[#22c55e]/12 text-[#22c55e]'
                : 'bg-[#ef4444]/12 text-[#ef4444]'
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
