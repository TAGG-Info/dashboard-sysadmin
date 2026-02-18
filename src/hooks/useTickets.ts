'use client';

import { useAutoRefresh } from './useAutoRefresh';
import type { InstanceMetadata } from '@/types/common';
import type { GLPITicket, GLPITicketSummary } from '@/types/glpi';

const REFRESH = Math.max(10000, Number(process.env.NEXT_PUBLIC_REFRESH_TICKETS) || 60000);

/** Types with instance metadata for multi-instance support */
export type GLPITicketWithInstance = GLPITicket & Partial<InstanceMetadata>;

export function useTickets() {
  return useAutoRefresh<GLPITicketWithInstance[]>({
    url: '/api/glpi/tickets',
    interval: REFRESH,
  });
}

export function useTicketSummary() {
  return useAutoRefresh<GLPITicketSummary>({
    url: '/api/glpi/summary',
    interval: REFRESH,
  });
}
