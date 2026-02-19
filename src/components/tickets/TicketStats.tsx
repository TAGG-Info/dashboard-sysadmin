'use client';

import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { useTicketSummary } from '@/hooks/useTickets';

export function TicketStats() {
  const { data: summary, loading, error, refresh } = useTicketSummary();

  if (error && !summary) {
    return <ErrorState title="Erreur GLPI" message={error.message} source="GLPI" onRetry={refresh} />;
  }

  if (loading && !summary) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="bg-card border-border/50">
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const newCount = summary.byStatus?.[1] ?? 0;
  const assignedCount = summary.byStatus?.[2] ?? 0;

  const stats = [
    {
      label: 'Total ouverts',
      value: summary.openCount,
      color: '#FEC72D',
      badge: null,
    },
    {
      label: 'Nouveaux',
      value: newCount,
      color: '#8b5cf6',
      badge: newCount > 0 ? ('new' as const) : null,
    },
    {
      label: 'Assignes',
      value: assignedCount,
      color: '#3b82f6',
      badge: assignedCount > 0 ? ('info' as const) : null,
    },
    {
      label: 'Critiques',
      value: summary.criticalCount,
      color: '#ef4444',
      badge: summary.criticalCount > 0 ? ('critical' as const) : null,
    },
    {
      label: 'Temps moyen resolution',
      value: summary.avgResolutionHours ? `${summary.avgResolutionHours.toFixed(1)}h` : 'N/A',
      color: '#6b7280',
      badge: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          color={stat.color}
          badge={
            stat.badge ? (
              <StatusBadge status={stat.badge} label={`${stat.value} ${stat.label.toLowerCase()}`} className="mt-1" />
            ) : undefined
          }
        />
      ))}
    </div>
  );
}
