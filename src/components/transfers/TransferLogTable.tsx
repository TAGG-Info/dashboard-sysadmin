'use client';

import { useState, useCallback } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Shield, ShieldOff, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useColumnResize } from '@/hooks/useColumnResize';
import { useRefreshSignal } from '@/hooks/useRefreshSignal';
import { useTransferLogs } from '@/hooks/useTransfers';
import { formatBytes, formatDateTimeFR } from '@/lib/formatters';
import { TransferFilters, type TransferFilterValues } from './TransferFilters';
import { SourceLogo } from '@/components/ui/SourceLogo';

const PAGE_SIZE = 25;

// Default column widths in pixels: Date, Compte, Login, Fichier, Taille, Proto, Sens, TLS, Statut, Duree
const DEFAULT_WIDTHS = [155, 130, 100, 240, 70, 75, 50, 50, 110, 70];

const COLS = [
  { label: 'Date', align: 'left' },
  { label: 'Compte', align: 'left' },
  { label: 'Login', align: 'left' },
  { label: 'Fichier', align: 'left' },
  { label: 'Taille', align: 'right' },
  { label: 'Proto', align: 'left' },
  { label: 'Sens', align: 'center' },
  { label: 'TLS', align: 'center' },
  { label: 'Statut', align: 'left' },
  { label: 'Durée', align: 'right' },
] as const;

function StatusCell({ status }: { status: string }) {
  const cls =
    status === 'Processed'
      ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20'
      : status === 'Failed' ||
          status === 'Aborted' ||
          status === 'Failed Subtransmission' ||
          status === 'Failed Transfer Resubmit'
        ? 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20'
        : status === 'In Progress'
          ? 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20'
          : status === 'Paused' || status === 'Waiting' || status === 'Pending receipt'
            ? 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20'
            : 'bg-muted/30 text-muted-foreground border-border/50';
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${cls}`}>{status}</span>
  );
}

const PROTOCOL_COLORS: Record<string, string> = {
  SSH: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  PESIT: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  FTP: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  HTTPS: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  AS2: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
};

function ProtocolBadge({ protocol }: { protocol: string }) {
  const p = protocol.toUpperCase();
  const cls = PROTOCOL_COLORS[p] ?? 'bg-muted/30 text-muted-foreground border-border/50';
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-xs font-semibold ${cls}`}>
      {p}
    </span>
  );
}

export function TransferLogTable({ refreshSignal }: { refreshSignal?: number }) {
  const [filters, setFilters] = useState<TransferFilterValues>({});
  const [page, setPage] = useState(0);

  // Column widths (resizable)
  const { widths, startResize, resetWidths } = useColumnResize(DEFAULT_WIDTHS);

  const resetPage = useCallback(() => setPage(0), []);

  const { data, loading, error, refresh, isStale } = useTransferLogs({
    account: filters.account,
    filename: filters.filename,
    status: filters.status,
    incoming: filters.incoming,
    protocol: filters.protocol,
    startDate: filters.startDate,
    endDate: filters.endDate,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  useRefreshSignal(refreshSignal, refresh);

  const transfers = data?.transfers ?? [];
  const totalCount = data?.resultSet?.totalCount ?? 0;
  const returnCount = data?.resultSet?.returnCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (error && !data) {
    return (
      <ErrorState title="Erreur logs de transfert" message={error.message} source="SecureTransport" onRetry={refresh} />
    );
  }

  return (
    <div className="relative">
      {loading && data && (
        <div className="bg-background/30 absolute inset-0 z-20 flex items-center justify-center rounded-lg backdrop-blur-sm">
          <div className="bg-background/80 border-border/50 flex items-center gap-2 rounded-full border px-4 py-2 shadow-md">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            <span className="text-muted-foreground text-xs">Chargement…</span>
          </div>
        </div>
      )}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-foreground flex items-center gap-2 text-base font-semibold">
              <SourceLogo source="securetransport" size={18} />
              Logs de transfert
              {loading && !data && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}
              {totalCount > 0 && (
                <Badge variant="outline" className="text-muted-foreground text-xs">
                  {totalCount.toLocaleString('fr-FR')} total
                </Badge>
              )}
              {isStale && <span className="text-xs text-[#f59e0b]">cache</span>}
            </CardTitle>
            <div className="flex items-center gap-3">
              <button
                onClick={resetWidths}
                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                title="Réinitialiser la largeur des colonnes"
              >
                ⇔ Reset colonnes
              </button>
            </div>
          </div>

          <TransferFilters onFilterChange={setFilters} onPageReset={resetPage} />
        </CardHeader>

        <CardContent className="p-0">
          {/* Table */}
          <div>
            <table className="text-sm">
              <colgroup>
                {widths.map((w, i) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-border/50 bg-muted/20 border-b">
                  {COLS.map((col, i) => (
                    <th
                      key={col.label}
                      className={`text-muted-foreground relative px-3 py-2 text-xs font-medium select-none text-${col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left'}`}
                    >
                      <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{col.label}</span>
                      {/* Resize handle */}
                      <div
                        onPointerDown={(e) => startResize(e, i)}
                        className="group absolute top-0 right-0 h-full w-1.5 cursor-col-resize"
                      >
                        <div className="bg-border/0 group-hover:bg-border/60 mx-auto h-full w-px transition-colors" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && !data ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-border/30 border-b">
                      {Array.from({ length: COLS.length }).map((_, j) => (
                        <td key={j} className="px-3 py-1.5">
                          <Skeleton className="h-3.5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : transfers.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="text-muted-foreground px-4 py-10 text-center text-sm">
                      Aucun transfert trouvé
                    </td>
                  </tr>
                ) : (
                  transfers.map((t, i) => (
                    <tr
                      key={t.id?.urlrepresentation ?? i}
                      className="border-border/30 hover:bg-muted/10 border-b transition-colors"
                    >
                      <td className="overflow-hidden px-3 py-1.5" title={t.startTime}>
                        {(() => {
                          const { date, time } = formatDateTimeFR(t.startTime);
                          return (
                            <>
                              <span className="text-foreground/80 block truncate text-xs">{date}</span>
                              <span className="text-muted-foreground block truncate font-mono text-[11px]">{time}</span>
                            </>
                          );
                        })()}
                      </td>
                      <td className="text-foreground overflow-hidden px-3 py-1.5 text-xs font-medium">
                        <span className="block truncate" title={t.account}>
                          {t.account}
                        </span>
                      </td>
                      <td className="text-muted-foreground overflow-hidden px-3 py-1.5 text-xs">
                        <span className="block truncate" title={t.login}>
                          {t.login}
                        </span>
                      </td>
                      <td className="overflow-hidden px-3 py-1.5">
                        <span className="text-foreground block truncate text-xs" title={t.filename}>
                          {t.filename}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs" title={t.remoteDir}>
                          {t.remoteDir}
                        </span>
                      </td>
                      <td className="text-muted-foreground overflow-hidden px-3 py-1.5 text-right text-xs">
                        <span className="block truncate">{t.filesize != null ? formatBytes(t.filesize) : '—'}</span>
                      </td>
                      <td className="overflow-hidden px-3 py-1.5">
                        <ProtocolBadge protocol={t.protocol} />
                      </td>
                      <td className="px-3 py-1.5 text-center" title={t.incoming ? 'Entrant' : 'Sortant'}>
                        {t.incoming ? (
                          <ArrowDownToLine className="mx-auto h-3.5 w-3.5 text-[#10b981]" />
                        ) : (
                          <ArrowUpFromLine className="mx-auto h-3.5 w-3.5 text-[#3b82f6]" />
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-center" title={t.secure ? 'TLS' : 'Non sécurisé'}>
                        {t.secure ? (
                          <Shield className="mx-auto h-3.5 w-3.5 text-[#10b981]" />
                        ) : (
                          <ShieldOff className="text-muted-foreground mx-auto h-3.5 w-3.5" />
                        )}
                      </td>
                      <td className="overflow-hidden px-3 py-1.5">
                        <StatusCell status={t.status} />
                      </td>
                      <td className="text-muted-foreground overflow-hidden px-3 py-1.5 text-right text-xs">
                        <span className="block truncate">{t.duration}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-border/50 flex items-center justify-between border-t px-4 py-3">
            <span className="text-muted-foreground text-xs">
              {totalCount > 0
                ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)} sur ${totalCount.toLocaleString('fr-FR')}`
                : returnCount > 0
                  ? `${returnCount} résultats`
                  : 'Aucun résultat'}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/20 flex h-7 w-7 items-center justify-center rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-foreground px-3 text-xs">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
                className="border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/20 flex h-7 w-7 items-center justify-center rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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
