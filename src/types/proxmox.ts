export type ProxmoxVMStatus = 'running' | 'stopped' | 'paused' | 'suspended';

export interface ProxmoxNode {
  node: string;
  status: 'online' | 'offline';
  cpu: number; // usage ratio 0-1
  maxcpu: number;
  mem: number; // bytes used
  maxmem: number; // bytes total
  disk: number;
  maxdisk: number;
  uptime: number; // seconds
}

export interface ProxmoxVM {
  vmid: number;
  name: string;
  status: ProxmoxVMStatus;
  type: 'qemu' | 'lxc';
  node: string;
  cpus: number;
  maxmem: number;
  mem: number;
  uptime: number;
  disk?: number;
  maxdisk?: number;
}

export interface ProxmoxStorage {
  storage: string;
  type: string;
  total: number; // bytes
  used: number;
  avail: number;
  active: boolean;
  node: string;
}
