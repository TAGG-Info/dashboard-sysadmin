'use client';

import { RefreshButton } from '@/components/ui/RefreshButton';
import { TransferStats } from '@/components/transfers/TransferStats';
import { TransferList } from '@/components/transfers/TransferList';
import { TransferLogTable } from '@/components/transfers/TransferLogTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePageRefresh } from '@/hooks/usePageRefresh';

export default function TransfersPage() {
  const { refreshKey, loading, handleRefresh } = usePageRefresh();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transferts SecureTransport"
        source="securetransport"
        actions={<RefreshButton onRefresh={handleRefresh} loading={loading} />}
      />

      {/* Split layout : sidebar (stats + certs) a gauche, table des logs a droite */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr] lg:items-start">

        {/* Sidebar — sticky sur desktop pour rester visible en scrollant */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-4">
          <TransferStats key={`stats-${refreshKey}`} compact />
          <TransferList key={`list-${refreshKey}`} />
        </div>

        {/* Table principale */}
        <div className="min-w-0">
          <TransferLogTable refreshSignal={refreshKey} />
        </div>

      </div>
    </div>
  );
}
