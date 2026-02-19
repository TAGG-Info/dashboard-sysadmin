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

      {/* Table principale */}
      <TransferLogTable />
    </div>
  );
}
