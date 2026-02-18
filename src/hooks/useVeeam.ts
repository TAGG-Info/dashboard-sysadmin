'use client';
import { useAutoRefresh } from './useAutoRefresh';
import type { InstanceMetadata } from '@/types/common';
import type { VeeamJob, VeeamSession } from '@/types/veeam';

const REFRESH = Math.max(10000, Number(process.env.NEXT_PUBLIC_REFRESH_VEEAM) || 120000);

/** Types with instance metadata for multi-instance support */
export type VeeamJobWithInstance = VeeamJob & Partial<InstanceMetadata>;
export type VeeamSessionWithInstance = VeeamSession & Partial<InstanceMetadata>;

export function useVeeamJobs() {
  return useAutoRefresh<VeeamJobWithInstance[]>({ url: '/api/veeam/jobs', interval: REFRESH });
}

export function useVeeamSessions() {
  return useAutoRefresh<VeeamSessionWithInstance[]>({ url: '/api/veeam/sessions', interval: REFRESH });
}
