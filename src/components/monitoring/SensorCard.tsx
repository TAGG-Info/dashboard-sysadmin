import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { TimeAgo } from '@/components/ui/TimeAgo';
import { Card, CardContent } from '@/components/ui/card';
import type { PRTGSensor } from '@/types/prtg';

function statusToLevel(status: string): 'healthy' | 'warning' | 'critical' | 'info' | 'neutral' {
  switch (status) {
    case 'Down':
      return 'critical';
    case 'Warning':
    case 'Unusual':
      return 'warning';
    case 'Up':
      return 'healthy';
    case 'Paused':
      return 'neutral';
    default:
      return 'info';
  }
}

interface SensorCardProps {
  sensor: PRTGSensor;
}

export function SensorCard({ sensor }: SensorCardProps) {
  const prtgUrl = process.env.NEXT_PUBLIC_PRTG_URL || '';

  return (
    <Card className="border-none bg-muted">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {sensor.name}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {sensor.type}
            </p>
          </div>
          <StatusBadge status={statusToLevel(sensor.status)} label={sensor.status} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Priority as stars */}
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-sm ${
                    i < sensor.priority ? 'text-[#f59e0b]' : 'text-muted-foreground/20'
                  }`}
                >
                  *
                </span>
              ))}
            </div>
            {sensor.metrics?.lastValue && (
              <span className="text-sm text-muted-foreground">
                {sensor.metrics.lastValue}
              </span>
            )}
          </div>

          {prtgUrl && (
            <ExternalLink
              href={`${prtgUrl}/sensor.htm?id=${sensor.id}`}
              label="PRTG"
              source="prtg"
            />
          )}
        </div>
        {sensor.metrics?.message && (
          <p className="text-sm text-muted-foreground/70 italic truncate">
            {sensor.metrics.message}
          </p>
        )}
        {sensor.metrics?.lastCheck && (
          <TimeAgo date={sensor.metrics.lastCheck} />
        )}
      </CardContent>
    </Card>
  );
}
