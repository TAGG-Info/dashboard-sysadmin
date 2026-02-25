'use client';

import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeAgo } from '@/components/ui/TimeAgo';
import { useTransferSummary } from '@/hooks/useTransfers';

export function TransferList() {
  const { data: summary, loading, error, refresh } = useTransferSummary();

  const expiringSoon = useMemo(() => summary?.certificates.expiringSoon ?? [], [summary]);

  // Detect multiple instances — must be before any early return (Rules of Hooks)
  const hasMultipleInstances = useMemo(() => {
    const ids = new Set(expiringSoon.map((c) => c._instanceId ?? 'default'));
    return ids.size > 1;
  }, [expiringSoon]);

  if (error && !summary) {
    return (
      <ErrorState title="Erreur SecureTransport" message={error.message} source="SecureTransport" onRetry={refresh} />
    );
  }

  if (loading && !summary) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />
          Certificats expirant bientot
        </CardTitle>
      </CardHeader>
      <CardContent>
        {expiringSoon.length === 0 ? (
          <div className="border-border flex items-center gap-3 rounded-lg border bg-[#10b981]/5 p-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[#10b981]" />
            <p className="text-muted-foreground text-sm">Aucun certificat n&apos;expire prochainement.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expiringSoon.map((cert, index) => (
              <div
                key={`${cert.alias}-${index}`}
                className="border-border flex items-center justify-between rounded-lg border bg-[#ef4444]/5 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <StatusBadge status="critical" label="Expire" />
                  <span className="text-foreground truncate text-sm font-medium">{cert.alias}</span>
                  {hasMultipleInstances && cert._instanceName && (
                    <Badge variant="outline" className="text-muted-foreground border-border shrink-0 text-sm">
                      {cert._instanceName}
                    </Badge>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-muted-foreground text-sm">Expire</span>
                  <TimeAgo date={cert.notAfter} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
