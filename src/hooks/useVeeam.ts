'use client';
import { useAutoRefresh } from './useAutoRefresh';
import { useRefreshIntervals } from '@/components/providers/RefreshIntervalsProvider';
import type { InstanceMetadata } from '@/types/common';
import type { VeeamJob, VeeamSession } from '@/types/veeam';

/** Types with instance metadata for multi-instance support */
export type VeeamJobWithInstance = VeeamJob & Partial<InstanceMetadata>;
export type VeeamSessionWithInstance = VeeamSession & Partial<InstanceMetadata>;

export function useVeeamJobs() {
  const { intervals } = useRefreshIntervals();
  return useAutoRefresh<VeeamJobWithInstance[]>({ url: '/api/veeam/jobs', interval: intervals.veeam });
}

export function useVeeamSessions() {
  const { intervals } = useRefreshIntervals();
  return useAutoRefresh<VeeamSessionWithInstance[]>({ url: '/api/veeam/sessions', interval: intervals.veeam });
}
