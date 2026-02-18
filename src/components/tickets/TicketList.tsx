'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeAgo } from '@/components/ui/TimeAgo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketFilters, type TicketFilterValues } from './TicketFilters';
import { useColumnResize } from '@/hooks/useColumnResize';
import { useTickets } from '@/hooks/useTickets';

const STATUS_LABELS: Record<number, string> = {
  1: 'Nouveau',
  2: 'Assigne',
  3: 'Planifie',
  4: 'En attente',
  5: 'Resolu',
  6: 'Clos',
};

const STATUS_MAP: Record<number, 'new' | 'info' | 'neutral' | 'warning' | 'healthy' | 'critical'> = {
  1: 'new',
  2: 'info',
  3: 'info',
  4: 'warning',
  5: 'healthy',
  6: 'neutral',
};

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Tres basse',
  2: 'Basse',
  3: 'Moyenne',
  4: 'Haute',
  5: 'Tres haute',
  6: 'Majeure',
};

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-[#6b7280]/15 text-[#6b7280] border-transparent',
  2: 'bg-[#6b7280]/15 text-[#6b7280] border-transparent',
  3: 'bg-[#3b82f6]/15 text-[#3b82f6] border-transparent',
  4: 'bg-[#f59e0b]/15 text-[#f59e0b] border-transparent',
  5: 'bg-[#ef4444]/15 text-[#ef4444] border-transparent',
  6: 'bg-[#ef4444]/15 text-[#ef4444] border-transparent',
};

const TYPE_LABELS: Record<number, string> = {
  1: 'Incident',
  2: 'Demande',
};

const COLS = [
  { label: 'ID', align: 'left' as const },
  { label: 'Titre', align: 'left' as const },
  { label: 'Priorite', align: 'left' as const },
  { label: 'Statut', align: 'left' as const },
  { label: 'Type', align: 'left' as const },
  { label: 'Assigne', align: 'left' as const },
  { label: 'Date', align: 'left' as const },
  { label: 'Lien', align: 'center' as const },
] as const;

const DEFAULT_WIDTHS = [70, 280, 120, 120, 100, 140, 120, 60];

export function TicketList({ refreshSignal }: { refreshSignal?: number }) {
  const { data: tickets, loading, error, refresh } = useTickets();

  const refreshRef = useRef<(() => Promise<void>) | undefined>(undefined);
  refreshRef.current = refresh;
  useEffect(() => { if (refreshSignal) refreshRef.current?.(); }, [refreshSignal]);
  const [filters, setFilters] = useState<TicketFilterValues>({
    status: 'all',
    priority: 'all',
    type: 'all',
  });
  const { widths, startResize, resetWidths } = useColumnResize(DEFAULT_WIDTHS);

  const glpiUrl = process.env.NEXT_PUBLIC_GLPI_URL || '';

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];

    let result = [...tickets];

    // Apply filters
    if (filters.status !== 'all') {
      const statusNum = Number(filters.status);
      result = result.filter((t) => t.status === statusNum);
    }
    if (filters.priority !== 'all') {
      const priorityNum = Number(filters.priority);
      result = result.filter((t) => t.priority === priorityNum);
    }
    if (filters.type !== 'all') {
      const typeNum = Number(filters.type);
      result = result.filter((t) => t.type === typeNum);
    }

    // Sort by priority (desc) then date (desc)
    result.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return result;
  }, [tickets, filters]);

  // Detect multiple instances
  const hasMultipleInstances = useMemo(() => {
    if (!tickets) return false;
    const ids = new Set(tickets.map((t) => t._instanceId ?? 'default'));
    return ids.size > 1;
  }, [tickets]);

  if (error && !tickets) {
    return (
      <ErrorState
        title="Erreur GLPI"
        message={error.message}
        source="GLPI"
        onRetry={refresh}
      />
    );
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold text-foreground">
            Liste des tickets
            {tickets && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredTickets.length}
                {filteredTickets.length !== tickets.length
                  ? ` / ${tickets.length}`
                  : ''})
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-3">
            <button
              onClick={resetWidths}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Reinitialiser la largeur des colonnes"
            >
              Reset colonnes
            </button>
            <TicketFilters filters={filters} onFilterChange={setFilters} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading && !tickets ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Aucun ticket ne correspond aux filtres selectionnes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-fixed text-sm" style={{ width: widths.reduce((a, b) => a + b, 0) + (hasMultipleInstances ? 140 : 0) }}>
              <colgroup>
                {widths.slice(0, 2).map((w, i) => <col key={i} style={{ width: w }} />)}
                {hasMultipleInstances && <col style={{ width: 140 }} />}
                {widths.slice(2).map((w, i) => <col key={i + 2} style={{ width: w }} />)}
              </colgroup>
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  {COLS.slice(0, 2).map((col, i) => (
                    <th
                      key={col.label}
                      className={`relative px-3 py-2 text-xs font-medium text-muted-foreground select-none text-${col.align}`}
                    >
                      <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{col.label}</span>
                      <div
                        onPointerDown={(e) => startResize(e, i)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize group"
                      >
                        <div className="mx-auto h-full w-px bg-border/0 group-hover:bg-border/60 transition-colors" />
                      </div>
                    </th>
                  ))}
                  {hasMultipleInstances && (
                    <th className="px-3 py-2 text-xs font-medium text-muted-foreground select-none text-left">
                      <span className="block overflow-hidden text-ellipsis whitespace-nowrap">Instance</span>
                    </th>
                  )}
                  {COLS.slice(2).map((col, i) => {
                    const colIndex = i + 2;
                    const isLast = colIndex === COLS.length - 1;
                    return (
                      <th
                        key={col.label}
                        className={`relative px-3 py-2 text-xs font-medium text-muted-foreground select-none text-${col.align}`}
                      >
                        <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{col.label}</span>
                        {!isLast && (
                          <div
                            onPointerDown={(e) => startResize(e, colIndex)}
                            className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize group"
                          >
                            <div className="mx-auto h-full w-px bg-border/0 group-hover:bg-border/60 transition-colors" />
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={`${ticket._instanceId ?? 'default'}-${ticket.id}`} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                    <td className="px-3 py-1.5 overflow-hidden font-mono text-xs text-muted-foreground">
                      <span className="block truncate">#{ticket.id}</span>
                    </td>
                    <td className="px-3 py-1.5 overflow-hidden">
                      <span className="block truncate text-xs text-foreground">{ticket.name}</span>
                    </td>
                    {hasMultipleInstances && (
                      <td className="px-3 py-1.5 overflow-hidden">
                        <Badge variant="outline" className="text-xs text-muted-foreground border-border/50">
                          {ticket._instanceName || 'Default'}
                        </Badge>
                      </td>
                    )}
                    <td className="px-3 py-1.5 overflow-hidden">
                      <Badge
                        className={
                          PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS[3]
                        }
                      >
                        {PRIORITY_LABELS[ticket.priority] ||
                          `P${ticket.priority}`}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 overflow-hidden">
                      <StatusBadge
                        status={STATUS_MAP[ticket.status] || 'neutral'}
                        label={
                          STATUS_LABELS[ticket.status] ||
                          `Statut ${ticket.status}`
                        }
                      />
                    </td>
                    <td className="px-3 py-1.5 overflow-hidden">
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[ticket.type] || `Type ${ticket.type}`}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 overflow-hidden text-xs text-muted-foreground">
                      <span className="block truncate">{ticket._users_id_assign || '\u2014'}</span>
                    </td>
                    <td className="px-3 py-1.5 overflow-hidden">
                      <TimeAgo date={ticket.date} />
                    </td>
                    <td className="px-3 py-1.5 overflow-hidden text-center">
                      {glpiUrl && <ExternalLink
                        href={`${glpiUrl}/front/ticket.form.php?id=${ticket.id}`}
                        label=""
                        source="glpi"
                      />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
