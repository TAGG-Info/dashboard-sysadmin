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

      {/* Stats cards */}
      <TransferStats key={`stats-${refreshKey}`} />

      {/* Certificats */}
      <TransferList key={`list-${refreshKey}`} />

      {/* Table principale */}
      <TransferLogTable refreshSignal={refreshKey} />
    </div>
  );
}
