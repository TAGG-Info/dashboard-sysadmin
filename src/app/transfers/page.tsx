'use client';

import { TransferStats } from '@/components/transfers/TransferStats';
import { TransferList } from '@/components/transfers/TransferList';
import { TransferLogTable } from '@/components/transfers/TransferLogTable';
import { PageHeader } from '@/components/layout/PageHeader';

export default function TransfersPage() {
  return (
    <div className="space-y-6" style={{ zoom: 1.15 }}>
      <PageHeader title="Transferts SecureTransport" source="securetransport" />

      {/* Stats cards */}
      <TransferStats />

      {/* Certificats */}
      <TransferList />

      {/* Tables incoming / outgoing — full bleed */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <TransferLogTable direction="incoming" />
        <TransferLogTable direction="outgoing" />
      </div>
    </div>
  );
}
