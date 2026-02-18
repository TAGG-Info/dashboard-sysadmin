'use client';

import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransferSummary } from '@/hooks/useTransfers';

export function TransferStats() {
  const { data: summary, loading, error, refresh } = useTransferSummary();

  if (error && !summary) {
    return (
      <ErrorState
        title="Erreur SecureTransport"
        message={error.message}
        source="SecureTransport"
        onRetry={refresh}
      />
    );
  }

  if (loading && !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="bg-card border-border/50">
            <CardContent className="p-4 space-y-2">
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

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Comptes actifs */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Comptes actifs</p>
          <p className="text-xl font-bold text-[#FF6D00]">
            {summary.accounts.active}
            <span className="text-sm font-normal text-muted-foreground">
              {' '}/ {summary.accounts.total}
            </span>
          </p>
          {summary.accounts.disabled > 0 && (
            <StatusBadge
              status="neutral"
              label={`${summary.accounts.disabled} desactive(s)`}
              className="mt-1"
            />
          )}
        </CardContent>
      </Card>

      {/* Certificats */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Certificats</p>
          <p className="text-xl font-bold text-foreground">
            {summary.certificates.total}
          </p>
          {expiringSoonCount > 0 ? (
            <StatusBadge
              status="warning"
              label={`${expiringSoonCount} expire(nt) bientot`}
              className="mt-1"
            />
          ) : (
            <StatusBadge
              status="healthy"
              label="Tous valides"
              className="mt-1"
            />
          )}
        </CardContent>
      </Card>

      {/* Sites */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Sites de transfert</p>
          <p className="text-xl font-bold text-foreground">
            {summary.sites.total}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
