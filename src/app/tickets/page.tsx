'use client';

import { TicketStats } from '@/components/tickets/TicketStats';
import { TicketList } from '@/components/tickets/TicketList';
import { PageHeader } from '@/components/layout/PageHeader';

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Tickets GLPI" source="glpi" />

      {/* Stats cards */}
      <TicketStats />

      {/* Ticket list with filters */}
      <TicketList />
    </div>
  );
}
