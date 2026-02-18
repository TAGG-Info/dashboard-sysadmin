'use client';

import { useAutoRefresh } from './useAutoRefresh';
import type { STTransferSummary, STCertificateExpiring, STTransferLogList } from '@/types/securetransport';

export type { STTransferSummary, STCertificateExpiring, STTransferLogList };

const REFRESH = Math.max(10000, Number(process.env.NEXT_PUBLIC_REFRESH_TRANSFERS) || 120000);
const LOGS_REFRESH = Math.max(10000, Number(process.env.NEXT_PUBLIC_REFRESH_ST_LOGS) || 30000);

export function useTransferSummary() {
  return useAutoRefresh<STTransferSummary>({
    url: '/api/securetransport/transfers',
    interval: REFRESH,
  });
}

export function useTransferLogs(limit = 50, offset = 0) {
  return useAutoRefresh<STTransferLogList>({
    url: `/api/securetransport/logs?limit=${limit}&offset=${offset}`,
    interval: LOGS_REFRESH,
  });
}
