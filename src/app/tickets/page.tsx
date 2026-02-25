'use client';

import { useState } from 'react';
import { TicketStats } from '@/components/tickets/TicketStats';
import { TicketList } from '@/components/tickets/TicketList';
import { PageHeader } from '@/components/layout/PageHeader';

export default function TicketsPage() {
  const [activeStatus, setActiveStatus] = useState('');

  return (
    <div className="space-y-6">
      <PageHeader title="Tickets GLPI" source="glpi" />

      {/* Stats cards — click to filter by status */}
      <TicketStats activeStatus={activeStatus} onStatusClick={setActiveStatus} />

      {/* Ticket list with filters */}
      <TicketList statusFilter={activeStatus} onStatusFilterChange={setActiveStatus} />
    </div>
  );
}
