'use client';

import { useMemo } from 'react';
import { useAutoRefresh } from './useAutoRefresh';
import { useRefreshIntervals } from '@/components/providers/RefreshIntervalsProvider';
import type { STTransferSummary, STCertificateExpiring, STTransferLogList } from '@/types/securetransport';

export type { STTransferSummary, STCertificateExpiring, STTransferLogList };

export interface TransferLogsParams {
  account?: string;
  filename?: string;
  status?: string;
  incoming?: boolean | null;
  protocol?: string;
  startDate?: number; // ms epoch
  endDate?: number; // ms epoch
  limit?: number;
  offset?: number;
}

export function useTransferSummary() {
  const { intervals } = useRefreshIntervals();
  return useAutoRefresh<STTransferSummary>({
    url: '/api/securetransport/transfers',
    interval: intervals.transfers,
  });
}

export function useTransferLogs(params: TransferLogsParams = {}) {
  const { intervals } = useRefreshIntervals();
  const url = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set('limit', String(params.limit ?? 50));
    qs.set('offset', String(params.offset ?? 0));
    if (params.account) qs.set('account', params.account);
    if (params.filename) qs.set('filename', params.filename);
    if (params.status) qs.set('status', params.status);
    if (params.incoming !== undefined && params.incoming !== null) qs.set('incoming', String(params.incoming));
    if (params.protocol) qs.set('protocol', params.protocol);
    if (params.startDate) qs.set('startDate', String(params.startDate));
    if (params.endDate) qs.set('endDate', String(params.endDate));
    return `/api/securetransport/logs?${qs.toString()}`;
  }, [
    params.limit,
    params.offset,
    params.account,
    params.filename,
    params.status,
    params.incoming,
    params.protocol,
    params.startDate,
    params.endDate,
  ]);

  return useAutoRefresh<STTransferLogList>({ url, interval: intervals.transferLogs });
}
