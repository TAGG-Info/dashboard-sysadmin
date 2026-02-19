'use client';

import { useAutoRefresh } from './useAutoRefresh';
import { useRefreshIntervals } from '@/components/providers/RefreshIntervalsProvider';
import type { PRTGDevice, PRTGSensor, PRTGSummary } from '@/types/prtg';
import type { InstanceMetadata } from '@/types/common';

/** Types with instance metadata for multi-instance support */
export type PRTGDeviceWithInstance = PRTGDevice & Partial<InstanceMetadata>;
export type PRTGSensorWithInstance = PRTGSensor & Partial<InstanceMetadata>;

export function usePRTGDevices() {
  const { intervals } = useRefreshIntervals();
  return useAutoRefresh<PRTGDeviceWithInstance[]>({
    url: '/api/prtg/devices',
    interval: intervals.prtg,
  });
}

export function usePRTGSensors(deviceId?: number) {
  const { intervals } = useRefreshIntervals();
  const url = deviceId ? `/api/prtg/sensors?deviceId=${deviceId}` : '/api/prtg/sensors';
  return useAutoRefresh<PRTGSensorWithInstance[]>({
    url,
    interval: intervals.prtg,
    // Per-device sensors: fetch once on expand, don't poll independently (#16)
    autoRefresh: !deviceId,
  });
}

export function usePRTGAlerts() {
  const { intervals } = useRefreshIntervals();
  return useAutoRefresh<PRTGSensorWithInstance[]>({
    url: '/api/prtg/alerts',
    interval: intervals.prtg,
  });
}

export function usePRTGSummary() {
  const { intervals } = useRefreshIntervals();
  return useAutoRefresh<PRTGSummary>({
    url: '/api/prtg/summary',
    interval: intervals.prtg,
  });
}
