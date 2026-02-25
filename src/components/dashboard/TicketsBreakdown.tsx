'use client';

import { useTicketSummary } from '@/hooks/useTickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { SourceLogo } from '@/components/ui/SourceLogo';
import { GLPI_STATUS_LABELS } from '@/types/glpi';
import type { GLPITicketStatus } from '@/types/glpi';

const STATUS_COLORS: Record<number, string> = {
  1: '#3b82f6',
  2: '#14b8a6',
  3: '#8b5cf6',
  4: '#f59e0b',
  5: '#10b981',
  6: '#64748b',
};

export function TicketsBreakdown() {
  const { data: summary, loading, error, refresh } = useTicketSummary();

  if (error && !summary) {
    return <ErrorState title="Tickets indisponibles" source="GLPI" onRetry={refresh} />;
  }

  if (loading && !summary) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <SourceLogo source="glpi" size={18} />
            <CardTitle className="text-sm">Tickets &mdash; R&eacute;partition</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const byStatus = summary?.byStatus ?? {};
  const maxCount = Math.max(...Object.values(byStatus), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <SourceLogo source="glpi" size={16} />
          <CardTitle className="text-sm font-semibold">Tickets &mdash; R&eacute;partition</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {([1, 2, 3, 4, 5, 6] as GLPITicketStatus[]).map((status) => {
            const count = byStatus[status] ?? 0;
            if (count === 0 && status >= 5) return null;
            const widthPct = Math.max((count / maxCount) * 100, count > 0 ? 8 : 0);
            return (
              <div key={status} className="flex items-center gap-2.5">
                <span className="text-muted-foreground w-[80px] shrink-0 text-right text-[13px] font-medium">
                  {GLPI_STATUS_LABELS[status]}
                </span>
                <div className="bg-secondary flex-1 overflow-hidden rounded-md" style={{ height: 26 }}>
                  {count > 0 && (
                    <div
                      className="flex h-full items-center rounded-md pl-2.5 text-xs font-bold text-white"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: STATUS_COLORS[status],
                        transition: 'width 0.4s ease',
                      }}
                    >
                      {count}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-muted-foreground mt-3 flex gap-6 border-t border-[var(--border)] pt-2.5 text-[13px]">
          {summary?.avgResolutionHours != null && (
            <span>
              R&eacute;solution moyenne{' '}
              <strong className="text-foreground">{summary.avgResolutionHours.toFixed(1)}h</strong>
            </span>
          )}
          {summary?.criticalCount != null && (
            <span>
              Critiques <strong className="text-red-400">{summary.criticalCount}</strong>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
