'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ArrowDownToLine, ArrowUpFromLine, Shield, ShieldOff,
  ChevronLeft, ChevronRight, Search, X, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useColumnResize } from '@/hooks/useColumnResize';
import { useTransferLogs } from '@/hooks/useTransfers';

const PAGE_SIZE = 25;
const DEFAULT_DATE_RANGE = 'today';

// Default column widths in pixels: Date, Compte, Fichier, Taille, Proto, Sens, TLS, Statut, Durée
const DEFAULT_WIDTHS = [120, 130, 240, 70, 70, 50, 50, 110, 70];

const COLS = [
  { label: 'Date',       align: 'left'   },
  { label: 'Compte',     align: 'left'   },
  { label: 'Fichier',    align: 'left'   },
  { label: 'Taille',     align: 'right'  },
  { label: 'Proto',      align: 'left'   },
  { label: 'Sens',       align: 'center' },
  { label: 'TLS',        align: 'center' },
  { label: 'Statut',     align: 'left'   },
  { label: 'Durée',      align: 'right'  },
] as const;

// Date range options (ms offset from now)
const DATE_RANGES = [
  { label: "Aujourd'hui",      value: 'today'   },
  { label: '7 derniers jours', value: '7d'      },
  { label: '30 derniers jours',value: '30d'     },
  { label: 'Tout',             value: 'all'     },
] as const;

// Arrondi à la fenêtre de 30s pour stabiliser l'URL entre les renders
// → évite la boucle infinie (endDate change → URL change → fetch → re-render → repeat)
// → la valeur ne change que toutes les ~30s, aligné avec le refresh interval
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return dateStr; }
}

function StatusCell({ status }: { status: string }) {
  const cls =
    status === 'Processed'             ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20' :
    status === 'Failed' || status === 'Aborted' || status === 'Failed Subtransmission' || status === 'Failed Transfer Resubmit'
                                       ? 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20' :
    status === 'In Progress'           ? 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20' :
    status === 'Paused' || status === 'Waiting' || status === 'Pending receipt'
                                       ? 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20' :
    'bg-muted/30 text-muted-foreground border-border/50';
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border ${cls}`}>
      {status}
    </span>
  );
}

export function TransferLogTable({ refreshSignal }: { refreshSignal?: number }) {
  // Visible filter inputs (updates immediately)
  const [accountInput,  setAccountInput]  = useState('');
  const [filenameInput, setFilenameInput] = useState('');
  const [status,    setStatus]    = useState('');
  const [incoming,  setIncoming]  = useState('');
  const [protocol,  setProtocol]  = useState('');
  const [dateRange, setDateRange] = useState<string>(DEFAULT_DATE_RANGE);
  const [page, setPage] = useState(0);

  // Debounced text values (sent to API)
  const [accountDebounced,  setAccountDebounced]  = useState('');
  const [filenameDebounced, setFilenameDebounced] = useState('');

  // Column widths (resizable)
  const { widths, startResize, resetWidths } = useColumnResize(DEFAULT_WIDTHS);

  useEffect(() => {
    const t = setTimeout(() => { setAccountDebounced(accountInput);  setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [accountInput]);

  useEffect(() => {
    const t = setTimeout(() => { setFilenameDebounced(filenameInput); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [filenameInput]);

  // Reset page when selects change
  useEffect(() => { setPage(0); }, [status, incoming, protocol, dateRange]);

  // Stable ref for refresh — avoids stale closure in the refreshSignal effect
  const refreshRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // Trigger refresh when parent signals a refresh (preserves filter state)
  useEffect(() => { if (refreshSignal) refreshRef.current?.(); }, [refreshSignal]);

  // Pas de useMemo : Date.now() doit être recalculé à chaque refresh cycle
  const dateParams = getDateRange(dateRange);

  const { data, loading, error, refresh, isStale } = useTransferLogs({
    account:   accountDebounced  || undefined,
    filename:  filenameDebounced || undefined,
    status:    status    || undefined,
    incoming:  incoming === 'true' ? true : incoming === 'false' ? false : undefined,
    protocol:  protocol  || undefined,
    startDate: dateParams.startDate,
    endDate:   dateParams.endDate,
    limit:  PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  // Keep refreshRef in sync with the latest refresh identity
  refreshRef.current = refresh;

  const transfers   = data?.transfers   ?? [];
  const totalCount  = data?.resultSet?.totalCount  ?? 0;
  const returnCount = data?.resultSet?.returnCount ?? 0;
  const totalPages  = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function clearFilters() {
    setAccountInput('');  setAccountDebounced('');
    setFilenameInput(''); setFilenameDebounced('');
    setStatus(''); setIncoming(''); setProtocol('');
    setDateRange(DEFAULT_DATE_RANGE);
    setPage(0);
  }

  const hasFilters = accountInput || filenameInput || status || incoming || protocol || dateRange !== DEFAULT_DATE_RANGE;

  if (error && !data) {
    return (
      <ErrorState
        title="Erreur logs de transfert"
        message={error.message}
        source="SecureTransport"
        onRetry={refresh}
      />
    );
  }

  return (
    <div className="relative">
      {loading && data && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg backdrop-blur-sm bg-background/30">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 border border-border/50 shadow-md">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Chargement…</span>
          </div>
        </div>
      )}
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            Logs de transfert
            {totalCount > 0 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {totalCount.toLocaleString('fr-FR')} total
              </Badge>
            )}
            {isStale && (
              <span className="text-xs text-[#f59e0b]">cache</span>
            )}
          </CardTitle>
          <div className="flex items-center gap-3">
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
                Réinitialiser
              </button>
            )}
            <button
              onClick={resetWidths}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Réinitialiser la largeur des colonnes"
            >
              ⇔ Reset colonnes
            </button>
          </div>
        </div>

        {/* Filter bar */}
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
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <colgroup>
              {widths.map((w, i) => (
                <col key={i} style={{ minWidth: w, width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                {COLS.map((col, i) => (
                  <th
                    key={col.label}
                    className={`relative px-3 py-2 text-xs font-medium text-muted-foreground select-none
                      text-${col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left'}`}
                  >
                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{col.label}</span>
                    {/* Resize handle */}
                    <div
                      onPointerDown={(e) => startResize(e, i)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize group"
                    >
                      <div className="mx-auto h-full w-px bg-border/0 group-hover:bg-border/60 transition-colors" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {Array.from({ length: COLS.length }).map((_, j) => (
                      <td key={j} className="px-3 py-1.5">
                        <Skeleton className="h-3.5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={COLS.length} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Aucun transfert trouvé
                  </td>
                </tr>
              ) : (
                transfers.map((t, i) => (
                  <tr
                    key={t.id?.urlrepresentation ?? i}
                    className="border-b border-border/30 hover:bg-muted/10 transition-colors"
                  >
                    <td className="px-3 py-1.5 text-xs text-muted-foreground overflow-hidden">
                      <span className="block truncate" title={t.startTime}>{formatDate(t.startTime)}</span>
                    </td>
                    <td className="px-3 py-1.5 text-xs font-medium text-foreground overflow-hidden">
                      <span className="block truncate" title={t.account}>{t.account}</span>
                    </td>
                    <td className="px-3 py-1.5 overflow-hidden">
                      <span className="block truncate text-foreground text-xs" title={t.filename}>
                        {t.filename}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground" title={t.remoteDir}>
                        {t.remoteDir}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right text-xs text-muted-foreground overflow-hidden">
                      <span className="block truncate">{formatBytes(t.filesize)}</span>
                    </td>
                    <td className="px-3 py-1.5 overflow-hidden">
                      <Badge variant="outline" className="text-xs uppercase font-mono">
                        {t.protocol}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-center" title={t.incoming ? 'Entrant' : 'Sortant'}>
                      {t.incoming
                        ? <ArrowDownToLine className="h-3.5 w-3.5 text-[#10b981] mx-auto" />
                        : <ArrowUpFromLine className="h-3.5 w-3.5 text-[#3b82f6] mx-auto" />
                      }
                    </td>
                    <td className="px-3 py-1.5 text-center" title={t.secure ? 'TLS' : 'Non sécurisé'}>
                      {t.secure
                        ? <Shield    className="h-3.5 w-3.5 text-[#10b981] mx-auto" />
                        : <ShieldOff className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                      }
                    </td>
                    <td className="px-3 py-1.5 overflow-hidden">
                      <StatusCell status={t.status} />
                    </td>
                    <td className="px-3 py-1.5 text-right text-xs text-muted-foreground overflow-hidden">
                      <span className="block truncate">{t.duration}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {totalCount > 0
              ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)} sur ${totalCount.toLocaleString('fr-FR')}`
              : returnCount > 0
                ? `${returnCount} résultats`
                : 'Aucun résultat'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="flex items-center justify-center h-7 w-7 rounded border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs text-foreground">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="flex items-center justify-center h-7 w-7 rounded border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
