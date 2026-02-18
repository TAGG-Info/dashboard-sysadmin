'use client';

import { useState, useCallback } from 'react';
import { TicketStats } from '@/components/tickets/TicketStats';
import { TicketList } from '@/components/tickets/TicketList';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { SourceIndicator } from '@/components/ui/SourceIndicator';

export default function TicketsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return (
    <div className="space-y-6" key={`tickets-${refreshKey}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Tickets GLPI</h1>
          <SourceIndicator source="glpi" connected />
        </div>
        <RefreshButton onRefresh={handleRefresh} loading={loading} />
      </div>

      {/* Stats cards */}
      <TicketStats />

      {/* Ticket list with filters */}
      <TicketList />
    </div>
  );
}
