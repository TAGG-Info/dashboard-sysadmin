'use client';

import { CheckCircle, XCircle, AlertTriangle, PauseCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePRTGSensors } from '@/hooks/usePRTG';

interface CounterCardProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}

function CounterCard({ label, count, icon, color }: CounterCardProps) {
  return (
    <Card className="border-none">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{count}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SensorGrid() {
  const { data: sensors, loading } = usePRTGSensors();

  if (loading && !sensors) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-none">
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const counts = {
    up: sensors?.filter((s) => s.status === 'Up').length ?? 0,
    down: sensors?.filter((s) => s.status === 'Down').length ?? 0,
    warning: sensors?.filter((s) => s.status === 'Warning' || s.status === 'Unusual').length ?? 0,
    paused: sensors?.filter((s) => s.status === 'Paused').length ?? 0,
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <CounterCard
        label="Up"
        count={counts.up}
        icon={<CheckCircle className="h-5 w-5" />}
        color="#10b981"
      />
      <CounterCard
        label="Down"
        count={counts.down}
        icon={<XCircle className="h-5 w-5" />}
        color="#ef4444"
      />
      <CounterCard
        label="Warning"
        count={counts.warning}
        icon={<AlertTriangle className="h-5 w-5" />}
        color="#f59e0b"
      />
      <CounterCard
        label="Paused"
        count={counts.paused}
        icon={<PauseCircle className="h-5 w-5" />}
        color="#6b7280"
      />
    </div>
  );
}
