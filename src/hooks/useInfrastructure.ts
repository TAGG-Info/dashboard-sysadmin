'use client';
import { useAutoRefresh } from './useAutoRefresh';
import { useRefreshIntervals } from '@/components/providers/RefreshIntervalsProvider';
import type { InstanceMetadata } from '@/types/common';
import type { VCenterVM, VCenterHost, VCenterDatastore } from '@/types/vcenter';
import type { ProxmoxNode, ProxmoxVM } from '@/types/proxmox';

/** Types with instance metadata for multi-instance support */
export type VCenterVMWithInstance = VCenterVM & Partial<InstanceMetadata>;
export type VCenterHostWithInstance = VCenterHost & Partial<InstanceMetadata>;
export type VCenterDatastoreWithInstance = VCenterDatastore & Partial<InstanceMetadata>;
export type ProxmoxNodeWithInstance = ProxmoxNode & Partial<InstanceMetadata>;
export type ProxmoxVMWithInstance = ProxmoxVM & Partial<InstanceMetadata>;

export function useVCenterVMs() {
  const { intervals } = useRefreshIntervals();
  return useAutoRefresh<VCenterVMWithInstance[]>({ url: '/api/vcenter/vms', interval: intervals.infra });
}

export function useVCenterHosts() {
  const { intervals } = useRefreshIntervals();
  return useAutoRefresh<VCenterHostWithInstance[]>({ url: '/api/vcenter/hosts', interval: intervals.infra });
}

export function useVCenterDatastores() {
  const { intervals } = useRefreshIntervals();
  return useAutoRefresh<VCenterDatastoreWithInstance[]>({ url: '/api/vcenter/datastores', interval: intervals.infra });
}

export function useProxmoxNodes() {
  const { intervals } = useRefreshIntervals();
  return useAutoRefresh<ProxmoxNodeWithInstance[]>({ url: '/api/proxmox/nodes', interval: intervals.infra });
}

export function useProxmoxVMs() {
  const { intervals } = useRefreshIntervals();
  return useAutoRefresh<ProxmoxVMWithInstance[]>({ url: '/api/proxmox/vms', interval: intervals.infra });
}
