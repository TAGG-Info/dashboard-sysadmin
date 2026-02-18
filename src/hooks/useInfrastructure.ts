'use client';
import { useAutoRefresh } from './useAutoRefresh';
import type { InstanceMetadata } from '@/types/common';
import type { VCenterVM, VCenterHost, VCenterDatastore } from '@/types/vcenter';
import type { ProxmoxNode, ProxmoxVM } from '@/types/proxmox';

const REFRESH = Math.max(10000, Number(process.env.NEXT_PUBLIC_REFRESH_INFRA) || 60000);

/** Types with instance metadata for multi-instance support */
export type VCenterVMWithInstance = VCenterVM & Partial<InstanceMetadata>;
export type VCenterHostWithInstance = VCenterHost & Partial<InstanceMetadata>;
export type VCenterDatastoreWithInstance = VCenterDatastore & Partial<InstanceMetadata>;
export type ProxmoxNodeWithInstance = ProxmoxNode & Partial<InstanceMetadata>;
export type ProxmoxVMWithInstance = ProxmoxVM & Partial<InstanceMetadata>;

export function useVCenterVMs() {
  return useAutoRefresh<VCenterVMWithInstance[]>({ url: '/api/vcenter/vms', interval: REFRESH });
}

export function useVCenterHosts() {
  return useAutoRefresh<VCenterHostWithInstance[]>({ url: '/api/vcenter/hosts', interval: REFRESH });
}

export function useVCenterDatastores() {
  return useAutoRefresh<VCenterDatastoreWithInstance[]>({ url: '/api/vcenter/datastores', interval: REFRESH });
}

export function useProxmoxNodes() {
  return useAutoRefresh<ProxmoxNodeWithInstance[]>({ url: '/api/proxmox/nodes', interval: REFRESH });
}

export function useProxmoxVMs() {
  return useAutoRefresh<ProxmoxVMWithInstance[]>({ url: '/api/proxmox/vms', interval: REFRESH });
}
