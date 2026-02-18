'use client';

import { CheckCircle, XCircle, ShieldCheck, AlertTriangle, Activity, PauseCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { usePRTGSummary } from '@/hooks/usePRTG';

export function SensorGrid() {
  const { data: summary, loading } = usePRTGSummary();

  if (loading && !summary) {
    return (
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
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

  return (
    <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
      <StatCard
        label="Up"
        value={summary?.sensors.up ?? 0}
        icon={<CheckCircle className="h-5 w-5" />}
        color="#4cb842"
      />
      <StatCard
        label="Down"
        value={summary?.sensors.down ?? 0}
        icon={<XCircle className="h-5 w-5" />}
        color="#d71920"
      />
      <StatCard
        label="Acknowledged"
        value={summary?.sensors.acknowledged ?? 0}
        icon={<ShieldCheck className="h-5 w-5" />}
        color="#832026"
      />
      <StatCard
        label="Warning"
        value={summary?.sensors.warning ?? 0}
        icon={<AlertTriangle className="h-5 w-5" />}
        color="#ffc000"
      />
      <StatCard
        label="Unusual"
        value={summary?.sensors.unusual ?? 0}
        icon={<Activity className="h-5 w-5" />}
        color="#ee7f00"
      />
      <StatCard
        label="Paused"
        value={summary?.sensors.paused ?? 0}
        icon={<PauseCircle className="h-5 w-5" />}
        color="#0073bf"
      />
    </div>
  );
}
