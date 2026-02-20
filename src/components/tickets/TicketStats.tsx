'use client';

import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { useTicketSummary } from '@/hooks/useTickets';

interface TicketStatsProps {
  activeStatus?: string;
  onStatusClick?: (status: string) => void;
}

export function TicketStats({ activeStatus, onStatusClick }: TicketStatsProps) {
  const { data: summary, loading, error, refresh } = useTicketSummary();

  if (error && !summary) {
    return <ErrorState title="Erreur GLPI" message={error.message} source="GLPI" onRetry={refresh} />;
  }

  if (loading && !summary) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
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
  const plannedCount = summary.byStatus?.[3] ?? 0;
  const pendingCount = summary.byStatus?.[4] ?? 0;

  const handleClick = (status: string) => {
    if (!onStatusClick) return;
    // Toggle: click again to clear
    onStatusClick(activeStatus === status ? '' : status);
  };

  const stats = [
    {
      label: 'Total ouverts',
      value: summary.openCount,
      color: '#FEC72D',
      badge: null,
      status: '',
    },
    {
      label: 'Nouveaux',
      value: newCount,
      color: '#8b5cf6',
      badge: newCount > 0 ? ('new' as const) : null,
      status: '1',
    },
    {
      label: 'Assignes',
      value: assignedCount,
      color: '#3b82f6',
      badge: assignedCount > 0 ? ('info' as const) : null,
      status: '2',
    },
    {
      label: 'Planifies',
      value: plannedCount,
      color: '#06b6d4',
      badge: plannedCount > 0 ? ('info' as const) : null,
      status: '3',
    },
    {
      label: 'En attente',
      value: pendingCount,
      color: '#f59e0b',
      badge: pendingCount > 0 ? ('warning' as const) : null,
      status: '4',
    },
    {
      label: 'Critiques',
      value: summary.criticalCount,
      color: '#ef4444',
      badge: summary.criticalCount > 0 ? ('critical' as const) : null,
      status: null, // Not a status filter
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          color={stat.color}
          onClick={stat.status !== null && onStatusClick ? () => handleClick(stat.status!) : undefined}
          active={stat.status !== null && activeStatus === stat.status}
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
