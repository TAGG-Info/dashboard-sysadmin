export type PowerState = 'POWERED_ON' | 'POWERED_OFF' | 'SUSPENDED';
export type ConnectionState = 'CONNECTED' | 'DISCONNECTED' | 'NOT_RESPONDING';

export interface VCenterVM {
  vm: string; // ID unique (vm-xxx)
  name: string;
  power_state: PowerState;
  cpu_count: number;
  memory_size_MiB: number;
  guest_OS?: string;
  host?: string;
}

export interface VCenterHost {
  host: string; // ID unique
  name: string;
  power_state: PowerState;
  connection_state: ConnectionState;
  cpu_count?: number;
  memory_size_MiB?: number;
  vm_count?: number;
  running_vm_count?: number;
}

export interface VCenterDatastore {
  datastore: string; // ID unique
  name: string;
  type: string;
  free_space: number; // bytes
  capacity: number; // bytes
}

export interface VCenterCluster {
  cluster: string;
  name: string;
  ha_enabled: boolean;
  drs_enabled: boolean;
}
