'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeAgo } from '@/components/ui/TimeAgo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketFilters, type TicketFilterValues } from './TicketFilters';
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

export function TicketList() {
  const { data: tickets, loading, error, refresh } = useTickets();
  const [filters, setFilters] = useState<TicketFilterValues>({
    status: 'all',
    priority: 'all',
    type: 'all',
  });

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
          <TicketFilters filters={filters} onFilterChange={setFilters} />
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
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-[70px]">ID</TableHead>
                  <TableHead>Titre</TableHead>
                  {hasMultipleInstances && (
                    <TableHead className="w-[140px]">Instance</TableHead>
                  )}
                  <TableHead className="w-[120px]">Priorite</TableHead>
                  <TableHead className="w-[120px]">Statut</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[140px]">Assigné</TableHead>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[60px]">Lien</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={`${ticket._instanceId ?? 'default'}-${ticket.id}`} className="border-border/50">
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      #{ticket.id}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground line-clamp-1">
                        {ticket.name}
                      </span>
                    </TableCell>
                    {hasMultipleInstances && (
                      <TableCell>
                        <Badge variant="outline" className="text-sm text-muted-foreground border-border/50">
                          {ticket._instanceName || 'Default'}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge
                        className={
                          PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS[3]
                        }
                      >
                        {PRIORITY_LABELS[ticket.priority] ||
                          `P${ticket.priority}`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={STATUS_MAP[ticket.status] || 'neutral'}
                        label={
                          STATUS_LABELS[ticket.status] ||
                          `Statut ${ticket.status}`
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-sm">
                        {TYPE_LABELS[ticket.type] || `Type ${ticket.type}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ticket._users_id_assign || '—'}
                    </TableCell>
                    <TableCell>
                      <TimeAgo date={ticket.date} />
                    </TableCell>
                    <TableCell>
                      {glpiUrl && <ExternalLink
                        href={`${glpiUrl}/front/ticket.form.php?id=${ticket.id}`}
                        label=""
                        source="glpi"
                      />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
