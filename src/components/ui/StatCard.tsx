import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function StatCard({ label, value, color, icon, badge }: StatCardProps) {
  if (icon) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: color ? `${color}15` : undefined }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold" style={color ? { color } : undefined}>
          {value}
        </p>
        {badge}
      </CardContent>
    </Card>
  );
}
