'use client';

import { useAutoRefresh } from './useAutoRefresh';
import { useRefreshIntervals } from '@/components/providers/RefreshIntervalsProvider';
import type { InstanceMetadata } from '@/types/common';
import type { GLPITicket, GLPITicketSummary } from '@/types/glpi';

/** Types with instance metadata for multi-instance support */
export type GLPITicketWithInstance = GLPITicket & Partial<InstanceMetadata>;

export function useTickets() {
  const { intervals } = useRefreshIntervals();
  return useAutoRefresh<GLPITicketWithInstance[]>({
    url: '/api/glpi/tickets',
    interval: intervals.tickets,
  });
}

export function useTicketSummary() {
  const { intervals } = useRefreshIntervals();
  return useAutoRefresh<GLPITicketSummary>({
    url: '/api/glpi/summary',
    interval: intervals.tickets,
  });
}
