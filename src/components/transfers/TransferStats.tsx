'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransferSummary } from '@/hooks/useTransfers';
import { ServiceStatusList } from '@/components/transfers/ServiceStatusList';

interface TransferStatsProps {
  /** Compact mode : une seule carte avec des lignes, pour la sidebar */
  compact?: boolean;
}

export function TransferStats({ compact = false }: TransferStatsProps) {
  const { data: summary, loading, error, refresh } = useTransferSummary();

  if (error && !summary) {
    return (
      <ErrorState title="Erreur SecureTransport" message={error.message} source="SecureTransport" onRetry={refresh} />
    );
  }

  /* ── Loading ── */
  if (loading && !summary) {
    if (compact) {
      return (
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-3.5 w-20" />
          </CardHeader>
          <CardContent className="p-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-border/60 flex items-center justify-between border-t px-4 py-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 2xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="">
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const expiringSoonCount = summary.certificates.expiringSoon?.length ?? 0;

  /* ── Compact (sidebar) ── */
  if (compact) {
    return (
      <Card>
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Résumé</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Comptes */}
          <div className="border-border/60 flex items-center justify-between border-t px-4 py-2.5">
            <span className="text-muted-foreground text-xs">Comptes actifs</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-[#FF6D00]">{summary.accounts.active}</span>
              <span className="text-muted-foreground/60 text-xs">/ {summary.accounts.total}</span>
              {summary.accounts.disabled > 0 && (
                <span className="text-muted-foreground/50 text-xs">· {summary.accounts.disabled} désact.</span>
              )}
            </div>
          </div>
          {/* Certificats */}
          <div className="border-border/60 flex items-center justify-between border-t px-4 py-2.5">
            <span className="text-muted-foreground text-xs">Certificats</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold">{summary.certificates.total}</span>
              {expiringSoonCount > 0 ? (
                <span className="text-xs text-[#f59e0b]">⚠ {expiringSoonCount}</span>
              ) : (
                <span className="text-xs text-[#10b981]">✓</span>
              )}
            </div>
          </div>
          {/* Sites */}
          <div className="border-border/60 flex items-center justify-between border-t px-4 py-2.5">
            <span className="text-muted-foreground text-xs">Sites de transfert</span>
            <span className="text-sm font-semibold">{summary.sites.total}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ── Normal (3 stats + services) ── */
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Comptes actifs */}
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Comptes actifs</p>
          <p className="text-xl font-bold text-[#FF6D00]">
            {summary.accounts.active}
            <span className="text-muted-foreground text-sm font-normal"> / {summary.accounts.total}</span>
          </p>
          {summary.accounts.disabled > 0 && (
            <StatusBadge status="neutral" label={`${summary.accounts.disabled} desactive(s)`} className="mt-1" />
          )}
        </CardContent>
      </Card>

      {/* Certificats */}
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Certificats</p>
          <p className="text-foreground text-xl font-bold">{summary.certificates.total}</p>
          {expiringSoonCount > 0 ? (
            <StatusBadge status="warning" label={`${expiringSoonCount} expire(nt) bientot`} className="mt-1" />
          ) : (
            <StatusBadge status="healthy" label="Tous valides" className="mt-1" />
          )}
        </CardContent>
      </Card>

      {/* Sites */}
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Sites de transfert</p>
          <p className="text-foreground text-xl font-bold">{summary.sites.total}</p>
        </CardContent>
      </Card>

      {/* Services / Protocoles */}
      <Card>
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Services</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pt-0 pb-3">
          <ServiceStatusList />
        </CardContent>
      </Card>
    </div>
  );
}
