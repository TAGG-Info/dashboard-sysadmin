'use client';

import { useState, useMemo, useCallback } from 'react';
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeAgo } from '@/components/ui/TimeAgo';
import { InstanceSectionHeader, groupByInstance, hasMultipleInstances } from '@/components/ui/InstanceGroup';
import { useColumnResize } from '@/hooks/useColumnResize';
import { useTickets } from '@/hooks/useTickets';
import { SourceLogo } from '@/components/ui/SourceLogo';
import type { GLPITicketWithInstance } from '@/hooks/useTickets';

// --- Labels & colors ---
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

// --- Column definitions ---
const COLS = [
  { key: 'id', label: 'ID', align: 'left' as const },
  { key: 'name', label: 'Titre', align: 'left' as const },
  { key: 'priority', label: 'Priorite', align: 'left' as const },
  { key: 'status', label: 'Statut', align: 'left' as const },
  { key: 'type', label: 'Type', align: 'left' as const },
  { key: 'assigned', label: 'Assigne', align: 'left' as const },
  { key: 'date', label: 'Date', align: 'left' as const },
  { key: 'link', label: 'Lien', align: 'center' as const },
] as const;

type ColKey = (typeof COLS)[number]['key'];

const DEFAULT_WIDTHS = [70, 280, 120, 120, 100, 140, 120, 60];

// --- Filter options ---
const STATUS_OPTIONS = [
  { value: '1', label: 'Nouveau' },
  { value: '2', label: 'Assigne' },
  { value: '3', label: 'Planifie' },
  { value: '4', label: 'En attente' },
];

const PRIORITY_OPTIONS = [
  { value: '6', label: 'Majeure' },
  { value: '5', label: 'Tres haute' },
  { value: '4', label: 'Haute' },
  { value: '3', label: 'Moyenne' },
  { value: '2', label: 'Basse' },
  { value: '1', label: 'Tres basse' },
];

const TYPE_OPTIONS = [
  { value: '1', label: 'Incident' },
  { value: '2', label: 'Demande' },
];

// --- Sorting ---
type SortDir = 'asc' | 'desc';

function getSortValue(ticket: GLPITicketWithInstance, key: ColKey): string | number {
  switch (key) {
    case 'id':
      return ticket.id;
    case 'name':
      return ticket.name.toLowerCase();
    case 'priority':
      return ticket.priority;
    case 'status':
      return ticket.status;
    case 'type':
      return ticket.type;
    case 'assigned':
      return (ticket._users_id_assign ?? '').toLowerCase();
    case 'date':
      return ticket.date;
    default:
      return '';
  }
}

function sortTickets(tickets: GLPITicketWithInstance[], key: ColKey, dir: SortDir): GLPITicketWithInstance[] {
  return [...tickets].sort((a, b) => {
    const va = getSortValue(a, key);
    const vb = getSortValue(b, key);
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// --- Component ---
interface TicketListProps {
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
}

export function TicketList({ statusFilter = '', onStatusFilterChange }: TicketListProps) {
  const { data: tickets, loading, error, refresh } = useTickets();
  const { widths, startResize, resetWidths } = useColumnResize(DEFAULT_WIDTHS);

  const glpiUrl = process.env.NEXT_PUBLIC_GLPI_URL || '';

  // Filters — status is controlled from parent (stats cards) or local Select
  const [searchText, setSearchText] = useState('');
  const filterStatus = statusFilter;
  const setFilterStatus = onStatusFilterChange ?? (() => {});
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');

  // Sort
  const [sortKey, setSortKey] = useState<ColKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = useCallback(
    (key: ColKey) => {
      if (key === 'link') return;
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey],
  );

  const hasFilters = searchText || filterStatus || filterPriority || filterType;

  const clearFilters = useCallback(() => {
    setSearchText('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterType('');
  }, [setFilterStatus]);

  // Filter + sort
  const processedTickets = useMemo(() => {
    if (!tickets) return [];
    let filtered = tickets as GLPITicketWithInstance[];

    if (searchText) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(q) || String(t.id).includes(q));
    }
    if (filterStatus) {
      const n = Number(filterStatus);
      filtered = filtered.filter((t) => t.status === n);
    }
    if (filterPriority) {
      const n = Number(filterPriority);
      filtered = filtered.filter((t) => t.priority === n);
    }
    if (filterType) {
      const n = Number(filterType);
      filtered = filtered.filter((t) => t.type === n);
    }

    if (sortKey) {
      filtered = sortTickets(filtered, sortKey, sortDir);
    }

    return filtered;
  }, [tickets, searchText, filterStatus, filterPriority, filterType, sortKey, sortDir]);

  // Group by instance (after filter+sort)
  const instanceGroups = useMemo(() => groupByInstance(processedTickets), [processedTickets]);
  const multipleInstances = tickets ? hasMultipleInstances(tickets) : false;

  const tableWidth = widths.reduce((a, b) => a + b, 0);

  if (error && !tickets) {
    return <ErrorState title="Erreur GLPI" message={error.message} source="GLPI" onRetry={refresh} />;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-foreground flex items-center gap-2 text-base font-semibold">
          <SourceLogo source="glpi" size={18} />
          Liste des tickets
          {tickets && (
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              ({processedTickets.length}
              {processedTickets.length !== tickets.length ? ` / ${tickets.length}` : ''})
            </span>
          )}
        </h3>
        <button
          onClick={resetWidths}
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          title="Reinitialiser la largeur des colonnes"
        >
          Reset colonnes
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Ticket ou #ID..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="bg-muted/20 border-border/50 focus:ring-ring h-8 w-44 rounded border pr-3 pl-7 text-sm focus:ring-1 focus:outline-none"
          />
        </div>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === '__all__' ? '' : v)}>
          <SelectTrigger className="bg-muted/20 border-border/50 h-8 w-auto min-w-[130px] text-sm">
            <SelectValue placeholder="Tous statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous statuts</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v === '__all__' ? '' : v)}>
          <SelectTrigger className="bg-muted/20 border-border/50 h-8 w-auto min-w-[130px] text-sm">
            <SelectValue placeholder="Toutes priorites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes priorites</SelectItem>
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={(v) => setFilterType(v === '__all__' ? '' : v)}>
          <SelectTrigger className="bg-muted/20 border-border/50 h-8 w-auto min-w-[110px] text-sm">
            <SelectValue placeholder="Tous types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous types</SelectItem>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground flex h-8 items-center gap-1 text-xs transition-colors"
          >
            <X className="h-3 w-3" />
            Reinitialiser
          </button>
        )}
      </div>

      {/* Tables by instance */}
      {instanceGroups.map(({ instanceId, instanceName, items }) => (
        <div key={instanceId}>
          {multipleInstances && <InstanceSectionHeader instanceName={instanceName} className="mb-2" />}
          <div className="border-border/50 max-h-[900px] overflow-auto rounded-lg border">
            <table className="table-fixed text-sm" style={{ width: tableWidth }}>
              <colgroup>
                {widths.map((w, i) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-border/50 bg-muted/20 border-b">
                  {COLS.map((col, i) => {
                    const isLast = i === COLS.length - 1;
                    const isSorted = sortKey === col.key;
                    const isSortable = col.key !== 'link';
                    return (
                      <th
                        key={col.key}
                        className={`bg-muted/20 text-muted-foreground relative sticky top-0 z-10 px-3 py-2 text-xs font-medium select-none text-${col.align}`}
                      >
                        {isSortable ? (
                          <button
                            onClick={() => handleSort(col.key)}
                            className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
                          >
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{col.label}</span>
                            {isSorted ? (
                              sortDir === 'asc' ? (
                                <ArrowUp className="h-3 w-3 shrink-0" />
                              ) : (
                                <ArrowDown className="h-3 w-3 shrink-0" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-40" />
                            )}
                          </button>
                        ) : (
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap">{col.label}</span>
                        )}
                        {!isLast && (
                          <div
                            onPointerDown={(e) => startResize(e, i)}
                            className="group absolute top-0 right-0 h-full w-1.5 cursor-col-resize"
                          >
                            <div className="bg-border/0 group-hover:bg-border/60 mx-auto h-full w-px transition-colors" />
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="text-muted-foreground py-8 text-center text-sm">
                      {hasFilters ? 'Aucun ticket correspondant aux filtres' : 'Aucun ticket'}
                    </td>
                  </tr>
                ) : (
                  items.map((ticket) => (
                    <tr
                      key={`${instanceId}-${ticket.id}`}
                      className="border-border/30 hover:bg-muted/10 border-b transition-colors"
                    >
                      <td className="text-muted-foreground overflow-hidden px-3 py-1.5 font-mono text-xs">
                        <span className="block truncate">#{ticket.id}</span>
                      </td>
                      <td className="overflow-hidden px-3 py-1.5">
                        <span className="text-foreground block truncate text-xs">{ticket.name}</span>
                      </td>
                      <td className="overflow-hidden px-3 py-1.5">
                        <Badge className={PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS[3]}>
                          {PRIORITY_LABELS[ticket.priority] || `P${ticket.priority}`}
                        </Badge>
                      </td>
                      <td className="overflow-hidden px-3 py-1.5">
                        <StatusBadge
                          status={STATUS_MAP[ticket.status] || 'neutral'}
                          label={STATUS_LABELS[ticket.status] || `Statut ${ticket.status}`}
                        />
                      </td>
                      <td className="overflow-hidden px-3 py-1.5">
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABELS[ticket.type] || `Type ${ticket.type}`}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground overflow-hidden px-3 py-1.5 text-xs">
                        <span className="block truncate">{ticket._users_id_assign || '\u2014'}</span>
                      </td>
                      <td className="overflow-hidden px-3 py-1.5">
                        <TimeAgo date={ticket.date} />
                      </td>
                      <td className="overflow-hidden px-3 py-1.5 text-center">
                        {glpiUrl && (
                          <ExternalLink
                            href={`${glpiUrl}/front/ticket.form.php?id=${ticket.id}`}
                            label=""
                            source="glpi"
                          />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Loading skeletons */}
      {loading && !tickets && instanceGroups.length === 0 && (
        <div className="border-border/50 overflow-x-auto rounded-lg border">
          <table className="table-fixed text-sm" style={{ width: tableWidth }}>
            <colgroup>
              {widths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-border/50 bg-muted/20 border-b">
                {COLS.map((col) => (
                  <th
                    key={col.key}
                    className={`text-muted-foreground px-3 py-2 text-xs font-medium select-none text-${col.align}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-border/30 border-b">
                  {Array.from({ length: COLS.length }).map((_, j) => (
                    <td key={j} className="px-3 py-1.5">
                      <Skeleton className="h-3.5 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
