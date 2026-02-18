'use client';

import { useAutoRefresh } from './useAutoRefresh';
import type { PRTGDevice, PRTGSensor, PRTGSummary } from '@/types/prtg';
import type { InstanceMetadata } from '@/types/common';

const REFRESH = Math.max(10000, Number(process.env.NEXT_PUBLIC_REFRESH_PRTG) || 30000);

/** Types with instance metadata for multi-instance support */
export type PRTGDeviceWithInstance = PRTGDevice & Partial<InstanceMetadata>;
export type PRTGSensorWithInstance = PRTGSensor & Partial<InstanceMetadata>;

export function usePRTGDevices() {
  return useAutoRefresh<PRTGDeviceWithInstance[]>({
    url: '/api/prtg/devices',
    interval: REFRESH,
  });
}

export function usePRTGSensors(deviceId?: number) {
  const url = deviceId
    ? `/api/prtg/sensors?deviceId=${deviceId}`
    : '/api/prtg/sensors';
  return useAutoRefresh<PRTGSensorWithInstance[]>({
    url,
    interval: REFRESH,
  });
}

export function usePRTGAlerts() {
  return useAutoRefresh<PRTGSensorWithInstance[]>({
    url: '/api/prtg/alerts',
    interval: REFRESH,
  });
}

export function usePRTGSummary() {
  return useAutoRefresh<PRTGSummary>({
    url: '/api/prtg/summary',
    interval: REFRESH,
  });
}
