'use client';

import { useProxmoxNodes } from '@/hooks/useInfrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';

function getGaugeColor(pct: number): [string, string] {
  if (pct > 80) return ['#f87171', '#ef4444'];
  if (pct >= 60) return ['#fbbf24', '#f59e0b'];
  return ['#60a5fa', '#3b82f6'];
}

function ArcGauge({ value, label, id }: { value: number; label: string; id: string }) {
  const r = 29;
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * 0.75;
  const filledLength = arcLength * (value / 100);
  const [c1, c2] = getGaugeColor(value);

  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={5} />
      <circle
        cx={36}
        cy={36}
        r={r}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={5}
        strokeDasharray={`${filledLength} ${circumference - filledLength}`}
        strokeDashoffset={-circumference * 0.25}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <text
        x={36}
        y={34}
        textAnchor="middle"
        fill="var(--foreground)"
        fontSize={17}
        fontWeight={800}
        fontFamily="Inter"
      >
        {Math.round(value)}
      </text>
      <text x={51} y={30} textAnchor="start" fill="var(--muted-foreground)" fontSize={9} fontWeight={600}>
        %
      </text>
      <text x={36} y={48} textAnchor="middle" fill="var(--muted-foreground)" fontSize={10} fontWeight={600}>
        {label}
      </text>
    </svg>
  );
}

export function ResourceGauges() {
  const { data: nodes, loading, error, refresh } = useProxmoxNodes();

  if (error && !nodes) {
    return <ErrorState title="Ressources indisponibles" source="Proxmox" onRetry={refresh} />;
  }

  if (loading && !nodes) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
            Ressources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3.5">
            <Skeleton className="h-[72px] w-[72px] rounded-full" />
            <Skeleton className="h-[72px] w-[72px] rounded-full" />
            <Skeleton className="h-[72px] w-[72px] rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const online = (nodes ?? []).filter((n) => n.status === 'online');
  const count = online.length || 1;
  const avgCpu = (online.reduce((s, n) => s + n.cpu, 0) / count) * 100;
  const avgRam = (online.reduce((s, n) => s + n.mem / n.maxmem, 0) / count) * 100;
  const avgDisk = (online.reduce((s, n) => s + n.disk / n.maxdisk, 0) / count) * 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
          Ressources
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3.5">
          <ArcGauge value={avgCpu} label="CPU" id="gc-cpu" />
          <ArcGauge value={avgRam} label="RAM" id="gc-ram" />
          <ArcGauge value={avgDisk} label="DISK" id="gc-disk" />
        </div>
      </CardContent>
    </Card>
  );
}
