import { cn } from '@/lib/utils';

interface MetricGaugeProps {
  value: number; // 0-100
  label: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  sm: { width: 64, strokeWidth: 4, fontSize: 'text-sm' },
  md: { width: 96, strokeWidth: 6, fontSize: 'text-sm' },
  lg: { width: 128, strokeWidth: 8, fontSize: 'text-base' },
};

function getColor(value: number): string {
  if (value > 85) return '#ef4444';
  if (value > 60) return '#f59e0b';
  return '#10b981';
}

export function MetricGauge({ value, label, size = 'md', className }: MetricGaugeProps) {
  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = config.width / 2;

  // Arc from 135deg to 405deg (270deg sweep)
  const sweepAngle = 270;
  const arcLength = (sweepAngle / 360) * circumference;
  const filledLength = (Math.min(Math.max(value, 0), 100) / 100) * arcLength;
  const color = getColor(value);

  // Start angle at 135 degrees (bottom-left)
  const startAngle = 135;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="relative" style={{ width: config.width, height: config.width }}>
        <svg
          width={config.width}
          height={config.width}
          viewBox={`0 0 ${config.width} ${config.width}`}
          className="-rotate-90"
          style={{ transform: `rotate(${startAngle}deg)` }}
        >
          {/* Background arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            className="text-muted/30"
          />
          {/* Filled arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={config.strokeWidth}
            strokeDasharray={`${filledLength} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        {/* Value text in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold text-foreground', config.fontSize)}>
            {Math.round(value)}%
          </span>
        </div>
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
