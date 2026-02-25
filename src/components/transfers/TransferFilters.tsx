'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface TransferFilterValues {
  account?: string;
  filename?: string;
  status?: string;
  incoming?: boolean;
  protocol?: string;
  startDate?: number;
  endDate?: number;
}

interface TransferFiltersProps {
  onFilterChange: (filters: TransferFilterValues) => void;
  onPageReset: () => void;
  hideDirection?: boolean;
}

const DEFAULT_DATE_RANGE = 'today';

const DATE_RANGES = [
  { label: "Aujourd'hui", value: 'today' },
  { label: '7 derniers jours', value: '7d' },
  { label: '30 derniers jours', value: '30d' },
  { label: 'Tout', value: 'all' },
] as const;

// Arrondi a la fenetre de 30s pour stabiliser l'URL entre les renders
const ROUND_MS = 30_000;
const roundNow = () => Math.ceil(Date.now() / ROUND_MS) * ROUND_MS;

function getDateRange(range: string): { startDate?: number } {
  const now = roundNow();
  if (range === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { startDate: start.getTime() };
  }
  if (range === '7d') return { startDate: now - 7 * 24 * 3600 * 1000 };
  if (range === '30d') return { startDate: now - 30 * 24 * 3600 * 1000 };
  return {};
}

export function TransferFilters({ onFilterChange, onPageReset, hideDirection }: TransferFiltersProps) {
  const [accountInput, setAccountInput] = useState('');
  const [filenameInput, setFilenameInput] = useState('');
  const [status, setStatus] = useState('');
  const [incoming, setIncoming] = useState('');
  const [protocol, setProtocol] = useState('');
  const [dateRange, setDateRange] = useState<string>(DEFAULT_DATE_RANGE);

  // Debounced text values (sent to API)
  const [accountDebounced, setAccountDebounced] = useState('');
  const [filenameDebounced, setFilenameDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setAccountDebounced(accountInput);
      onPageReset();
    }, 400);
    return () => clearTimeout(t);
  }, [accountInput]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => {
      setFilenameDebounced(filenameInput);
      onPageReset();
    }, 400);
    return () => clearTimeout(t);
  }, [filenameInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset page when selects change
  useEffect(() => {
    onPageReset();
  }, [status, incoming, protocol, dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent of filter values
  // Note: pas de endDate — les filtres relatifs (today/7d/30d) n'envoient que startDate
  // pour que l'API retourne les transferts jusqu'à l'instant présent du serveur.
  useEffect(() => {
    const dateParams = getDateRange(dateRange);
    onFilterChange({
      account: accountDebounced || undefined,
      filename: filenameDebounced || undefined,
      status: status || undefined,
      incoming: incoming === 'true' ? true : incoming === 'false' ? false : undefined,
      protocol: protocol || undefined,
      startDate: dateParams.startDate,
    });
  }, [accountDebounced, filenameDebounced, status, incoming, protocol, dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters =
    accountInput || filenameInput || status || incoming || protocol || dateRange !== DEFAULT_DATE_RANGE;

  const clearFilters = useCallback(() => {
    setAccountInput('');
    setAccountDebounced('');
    setFilenameInput('');
    setFilenameDebounced('');
    setStatus('');
    setIncoming('');
    setProtocol('');
    setDateRange(DEFAULT_DATE_RANGE);
    onPageReset();
  }, [onPageReset]);

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {/* Account search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Compte..."
          value={accountInput}
          onChange={(e) => setAccountInput(e.target.value)}
          className="bg-muted/20 border-border/60 focus:ring-ring h-8 w-36 rounded border pr-3 pl-7 text-sm focus:ring-1 focus:outline-none"
        />
      </div>

      {/* Filename search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Fichier..."
          value={filenameInput}
          onChange={(e) => setFilenameInput(e.target.value)}
          className="bg-muted/20 border-border/60 focus:ring-ring h-8 w-40 rounded border pr-3 pl-7 text-sm focus:ring-1 focus:outline-none"
        />
      </div>

      {!hideDirection && (
        <Select value={incoming || '__all__'} onValueChange={(v) => setIncoming(v === '__all__' ? '' : v)}>
          <SelectTrigger className="bg-muted/20 border-border/60 h-8 w-auto min-w-[110px] text-sm">
            <SelectValue placeholder="Tous sens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous sens</SelectItem>
            <SelectItem value="true">Entrant</SelectItem>
            <SelectItem value="false">Sortant</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Protocol */}
      <Select value={protocol || '__all__'} onValueChange={(v) => setProtocol(v === '__all__' ? '' : v)}>
        <SelectTrigger className="bg-muted/20 border-border/60 h-8 w-auto min-w-[110px] text-sm">
          <SelectValue placeholder="Protocole" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Protocole</SelectItem>
          <SelectItem value="ssh">SSH</SelectItem>
          <SelectItem value="ftp">FTP</SelectItem>
          <SelectItem value="https">HTTPS</SelectItem>
          <SelectItem value="as2">AS2</SelectItem>
          <SelectItem value="pesit">PeSIT</SelectItem>
        </SelectContent>
      </Select>

      {/* Status */}
      <Select value={status || '__all__'} onValueChange={(v) => setStatus(v === '__all__' ? '' : v)}>
        <SelectTrigger className="bg-muted/20 border-border/60 h-8 w-auto min-w-[110px] text-sm">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Statut</SelectItem>
          <SelectItem value="Processed">Processed</SelectItem>
          <SelectItem value="Failed">Failed</SelectItem>
          <SelectItem value="Failed Subtransmission">Failed Subtransmission</SelectItem>
          <SelectItem value="In Progress">In Progress</SelectItem>
          <SelectItem value="Aborted">Aborted</SelectItem>
          <SelectItem value="Paused">Paused</SelectItem>
          <SelectItem value="Waiting">Waiting</SelectItem>
          <SelectItem value="Pending receipt">Pending receipt</SelectItem>
        </SelectContent>
      </Select>

      {/* Date range */}
      <Select value={dateRange} onValueChange={setDateRange}>
        <SelectTrigger className="bg-muted/20 border-border/60 h-8 w-auto min-w-[140px] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGES.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
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
  );
}
