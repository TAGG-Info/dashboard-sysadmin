'use client';

import { useState, useCallback } from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { SourceIndicator } from '@/components/ui/SourceIndicator';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { TransferStats } from '@/components/transfers/TransferStats';
import { TransferList } from '@/components/transfers/TransferList';

export default function TransfersPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const stUrl = process.env.NEXT_PUBLIC_ST_URL || '';

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return (
    <div className="space-y-6" key={`transfers-${refreshKey}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            Transferts SecureTransport
          </h1>
          <SourceIndicator source="securetransport" connected />
        </div>
        <RefreshButton onRefresh={handleRefresh} loading={loading} />
      </div>

      {/* Stats cards */}
      <TransferStats />

      {/* Expiring certificates */}
      <TransferList />

      {/* Recent transfers info */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Info className="h-4 w-4 text-muted-foreground" />
            Transferts recents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 bg-muted/5 p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Le log de transfert n&apos;est pas toujours disponible via
              l&apos;API REST. Consultez l&apos;interface SecureTransport pour
              les details.
            </p>
            {stUrl && (
              <ExternalLink
                href={stUrl}
                label="Ouvrir SecureTransport"
                source="securetransport"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
