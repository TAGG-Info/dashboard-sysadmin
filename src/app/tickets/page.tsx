'use client';

import { TicketStats } from '@/components/tickets/TicketStats';
import { TicketList } from '@/components/tickets/TicketList';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePageRefresh } from '@/hooks/usePageRefresh';

export default function TicketsPage() {
  const { refreshKey, loading, handleRefresh } = usePageRefresh();

  return (
    <div className="space-y-6" key={`tickets-${refreshKey}`}>
      <PageHeader
        title="Tickets GLPI"
        source="glpi"
        actions={<RefreshButton onRefresh={handleRefresh} loading={loading} />}
      />

      {/* Stats cards */}
      <TicketStats />

      {/* Ticket list with filters */}
      <TicketList />
    </div>
  );
}
