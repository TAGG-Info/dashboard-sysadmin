'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';

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
}

const DEFAULT_DATE_RANGE = 'today';

const DATE_RANGES = [
  { label: "Aujourd'hui",      value: 'today'   },
  { label: '7 derniers jours', value: '7d'      },
  { label: '30 derniers jours',value: '30d'     },
  { label: 'Tout',             value: 'all'     },
] as const;

// Arrondi a la fenetre de 30s pour stabiliser l'URL entre les renders
const ROUND_MS = 30_000;
const roundNow = () => Math.ceil(Date.now() / ROUND_MS) * ROUND_MS;

function getDateRange(range: string): { startDate?: number; endDate?: number } {
  const now = roundNow();
  if (range === 'today') {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return { startDate: start.getTime(), endDate: now };
  }
  if (range === '7d')  return { startDate: now - 7  * 24 * 3600 * 1000, endDate: now };
  if (range === '30d') return { startDate: now - 30 * 24 * 3600 * 1000, endDate: now };
  return {};
}

export function TransferFilters({ onFilterChange, onPageReset }: TransferFiltersProps) {
  const [accountInput,  setAccountInput]  = useState('');
  const [filenameInput, setFilenameInput] = useState('');
  const [status,    setStatus]    = useState('');
  const [incoming,  setIncoming]  = useState('');
  const [protocol,  setProtocol]  = useState('');
  const [dateRange, setDateRange] = useState<string>(DEFAULT_DATE_RANGE);

  // Debounced text values (sent to API)
  const [accountDebounced,  setAccountDebounced]  = useState('');
  const [filenameDebounced, setFilenameDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setAccountDebounced(accountInput);  onPageReset(); }, 400);
    return () => clearTimeout(t);
  }, [accountInput]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => { setFilenameDebounced(filenameInput); onPageReset(); }, 400);
    return () => clearTimeout(t);
  }, [filenameInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset page when selects change
  useEffect(() => { onPageReset(); }, [status, incoming, protocol, dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent of filter values
  useEffect(() => {
    const dateParams = getDateRange(dateRange);
    onFilterChange({
      account:   accountDebounced  || undefined,
      filename:  filenameDebounced || undefined,
      status:    status    || undefined,
      incoming:  incoming === 'true' ? true : incoming === 'false' ? false : undefined,
      protocol:  protocol  || undefined,
      startDate: dateParams.startDate,
      endDate:   dateParams.endDate,
    });
  }, [accountDebounced, filenameDebounced, status, incoming, protocol, dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = accountInput || filenameInput || status || incoming || protocol || dateRange !== DEFAULT_DATE_RANGE;

  const clearFilters = useCallback(() => {
    setAccountInput('');  setAccountDebounced('');
    setFilenameInput(''); setFilenameDebounced('');
    setStatus(''); setIncoming(''); setProtocol('');
    setDateRange(DEFAULT_DATE_RANGE);
    onPageReset();
  }, [onPageReset]);

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {/* Account search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Compte..."
          value={accountInput}
          onChange={e => setAccountInput(e.target.value)}
          className="h-8 pl-7 pr-3 text-sm bg-muted/20 border border-border/50 rounded focus:outline-none focus:ring-1 focus:ring-ring w-36"
        />
      </div>

      {/* Filename search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Fichier..."
          value={filenameInput}
          onChange={e => setFilenameInput(e.target.value)}
          className="h-8 pl-7 pr-3 text-sm bg-muted/20 border border-border/50 rounded focus:outline-none focus:ring-1 focus:ring-ring w-40"
        />
      </div>

      {/* Direction */}
      <select
        value={incoming}
        onChange={e => setIncoming(e.target.value)}
        className="h-8 px-2 text-sm bg-muted/20 border border-border/50 rounded focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Tous sens</option>
        <option value="true">↓ Entrant</option>
        <option value="false">↑ Sortant</option>
      </select>

      {/* Protocol */}
      <select
        value={protocol}
        onChange={e => setProtocol(e.target.value)}
        className="h-8 px-2 text-sm bg-muted/20 border border-border/50 rounded focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Protocole</option>
        <option value="ssh">SSH</option>
        <option value="ftp">FTP</option>
        <option value="https">HTTPS</option>
        <option value="as2">AS2</option>
        <option value="pesit">PeSIT</option>
      </select>

      {/* Status */}
      <select
        value={status}
        onChange={e => setStatus(e.target.value)}
        className="h-8 px-2 text-sm bg-muted/20 border border-border/50 rounded focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Statut</option>
        <option value="Processed">Processed</option>
        <option value="Failed">Failed</option>
        <option value="In Progress">In Progress</option>
        <option value="Aborted">Aborted</option>
        <option value="Paused">Paused</option>
        <option value="Waiting">Waiting</option>
        <option value="Pending receipt">Pending receipt</option>
      </select>

      {/* Date range */}
      <select
        value={dateRange}
        onChange={e => setDateRange(e.target.value)}
        className="h-8 px-2 text-sm bg-muted/20 border border-border/50 rounded focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {DATE_RANGES.map(r => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 h-8 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
          Réinitialiser
        </button>
      )}
    </div>
  );
}
