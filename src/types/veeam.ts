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
