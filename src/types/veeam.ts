export type VeeamJobState = 'Stopped' | 'Working' | 'Idle';
export type VeeamResult = 'Success' | 'Warning' | 'Failed' | 'None';

export interface VeeamJob {
  id: string;
  name: string;
  type: string;
  isDisabled: boolean;
  schedule?: {
    isEnabled: boolean;
  };
  lastRun?: string;
  lastResult?: VeeamResult;
  objects?: number;
  status?: string;
  nextRun?: string;
  target?: string;
}

export interface VeeamSession {
  id: string;
  name: string;
  sessionType: string;
  state: VeeamJobState;
  result: {
    result: VeeamResult;
    message?: string;
  };
  progress?: number;
  creationTime: string;
  endTime?: string;
  statistics?: {
    processedSize?: number;
    readSize?: number;
    transferredSize?: number;
    duration?: number;
  };
}

export interface VeeamRepository {
  id: string;
  name: string;
  type: string;
  capacityGB: number;
  freeGB: number;
  usedSpaceGB: number;
}

// --- VBEM Reports API types ---

export interface VeeamOverview {
  BackupServers: number;
  ProxyServers: number;
  RepositoryServers: number;
  RunningJobs: number;
  ScheduledJobs: number;
  SuccessfulVmLastestStates: number;
  WarningVmLastestStates: number;
  FailedVmLastestStates: number;
}

export interface VeeamJobStatistics {
  RunningJobs: number;
  ScheduledJobs: number;
  ScheduledBackupJobs: number;
  ScheduledReplicaJobs: number;
  TotalJobRuns: number;
  SuccessfulJobRuns: number;
  WarningsJobRuns: number;
  FailedJobRuns: number;
  MaxJobDuration: number;
  MaxBackupJobDuration: number;
  MaxDurationBackupJobName: string;
}

export interface VeeamVmsOverview {
  ProtectedVms: number;
  BackedUpVms: number;
  ReplicatedVms: number;
  RestorePoints: number;
  FullBackupPointsSize: number;
  IncrementalBackupPointsSize: number;
  SourceVmsSize: number;
  SuccessBackupPercents: number;
}

export interface VeeamProcessedVmsDay {
  Timestamp: string;
  BackupedVms: number;
  ReplicatedVms: number;
}

export interface VeeamRepositoryReport {
  Name: string;
  Capacity: number;
  FreeSpace: number;
  BackupSize: number;
}

export interface VeeamSummary {
  overview: VeeamOverview;
  jobStats: VeeamJobStatistics;
  vmsOverview: VeeamVmsOverview;
  processedVms: VeeamProcessedVmsDay[];
  repositories: VeeamRepositoryReport[];
}
