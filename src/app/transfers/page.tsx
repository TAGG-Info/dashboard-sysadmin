'use client';

import { TransferStats } from '@/components/transfers/TransferStats';
import { TransferList } from '@/components/transfers/TransferList';
import { TransferLogTable } from '@/components/transfers/TransferLogTable';
import { PageHeader } from '@/components/layout/PageHeader';

export default function TransfersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Transferts SecureTransport" source="securetransport" />

      {/* Stats cards */}
      <TransferStats />

      {/* Certificats */}
      <TransferList />

      {/* Tables incoming / outgoing — full bleed */}
      <div className="-mx-4 grid grid-cols-1 gap-4 lg:-mx-6 lg:grid-cols-2 lg:gap-8">
        <TransferLogTable direction="incoming" />
        <TransferLogTable direction="outgoing" />
      </div>
    </div>
  );
}
