export type PRTGStatus = 'Up' | 'Warning' | 'Down' | 'Paused' | 'Unusual' | 'Unknown';

export interface PRTGDevice {
  id: number;
  name: string;
  host: string;
  tags: string[];
  status: PRTGStatus;
  parentGroupId: number;
  metrics?: {
    sensors: {
      up: number;
      down: number;
      warning: number;
      paused: number;
      unusual: number;
      undefined: number;
      total: number;
    };
  };
}

export interface PRTGSensor {
  id: number;
  name: string;
  type: string;
  status: PRTGStatus;
  priority: number;
  tags: string[];
  parentDeviceId: number;
  parentDeviceName?: string;
  metrics?: {
    lastValue: string;
    lastValueRaw: number;
    lastCheck: string;
    message: string;
  };
}

export interface PRTGChannel {
  id: number;
  name: string;
  lastValue: string;
  lastValueRaw: number;
  unit: string;
  sensorId: number;
}

export interface PRTGTimeseries {
  sensorId: number;
  channels: {
    name: string;
    unit: string;
    data: { timestamp: string; value: number }[];
  }[];
}

export interface PRTGSummary {
  sensors: { up: number; down: number; warning: number; paused: number; unusual: number; total: number };
  devices: { up: number; down: number; total: number };
}
