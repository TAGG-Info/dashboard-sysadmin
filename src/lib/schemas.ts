import { z } from 'zod/v4';
import { loggers } from '@/lib/logger';

// --- SecureTransport ---

export const stTransferLogSchema = z.object({
  id: z.object({
    mTransferStatusId: z.string(),
    mTransferStartTime: z.number(),
    urlrepresentation: z.string(),
  }),
  status: z.string(),
  secure: z.boolean(),
  resubmitted: z.boolean(),
  account: z.string(),
  login: z.string(),
  incoming: z.boolean(),
  serverInitiated: z.boolean(),
  serverName: z.string(),
  filename: z.string(),
  filesize: z.number(),
  protocol: z.string(),
  startTime: z.string(),
  duration: z.string(),
  remoteDir: z.string(),
  remotePartner: z.string().nullable(),
  site: z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
  }),
});

// --- PRTG ---

export const prtgDeviceSchema = z.object({
  id: z.number(),
  name: z.string(),
  host: z.string(),
  tags: z.array(z.string()),
  status: z.string(),
  parentGroupId: z.number(),
  metrics: z
    .object({
      sensors: z.object({
        up: z.number(),
        down: z.number(),
        warning: z.number(),
        paused: z.number(),
        unusual: z.number(),
        undefined: z.number(),
        total: z.number(),
      }),
    })
    .optional(),
});

export const prtgSensorSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  priority: z.number(),
  tags: z.array(z.string()),
  parentDeviceId: z.number(),
  parentDeviceName: z.string().optional(),
  metrics: z
    .object({
      lastValue: z.string(),
      lastValueRaw: z.number(),
      lastCheck: z.string(),
      message: z.string(),
    })
    .optional(),
});

// --- Veeam ---

export const veeamJobSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  isDisabled: z.boolean(),
  schedule: z
    .object({
      isEnabled: z.boolean(),
    })
    .optional(),
  lastRun: z.string().optional(),
  lastResult: z.string().optional(),
});

export const veeamSummarySchema = z.object({
  overview: z.object({
    BackupServers: z.number(),
    ProxyServers: z.number(),
    RepositoryServers: z.number(),
    RunningJobs: z.number(),
    ScheduledJobs: z.number(),
    SuccessfulVmLastestStates: z.number(),
    WarningVmLastestStates: z.number(),
    FailedVmLastestStates: z.number(),
  }),
  jobStats: z.object({
    RunningJobs: z.number(),
    ScheduledJobs: z.number(),
    ScheduledBackupJobs: z.number(),
    ScheduledReplicaJobs: z.number(),
    TotalJobRuns: z.number(),
    SuccessfulJobRuns: z.number(),
    WarningsJobRuns: z.number(),
    FailedJobRuns: z.number(),
    MaxJobDuration: z.number(),
    MaxBackupJobDuration: z.number(),
    MaxDurationBackupJobName: z.string(),
  }),
  vmsOverview: z.object({
    ProtectedVms: z.number(),
    BackedUpVms: z.number(),
    ReplicatedVms: z.number(),
    RestorePoints: z.number(),
    FullBackupPointsSize: z.number(),
    IncrementalBackupPointsSize: z.number(),
    SourceVmsSize: z.number(),
    SuccessBackupPercents: z.number(),
  }),
  processedVms: z.array(
    z.object({
      Timestamp: z.string(),
      BackupedVms: z.number(),
      ReplicatedVms: z.number(),
    }),
  ),
  repositories: z.array(
    z.object({
      Name: z.string(),
      Capacity: z.number(),
      FreeSpace: z.number(),
      BackupSize: z.number(),
    }),
  ),
});

// --- GLPI ---

export const glpiTicketSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.number(),
  priority: z.number(),
  urgency: z.number(),
  type: z.number(),
  date: z.string(),
  date_mod: z.string(),
  solvedate: z.string().optional(),
  closedate: z.string().optional(),
  content: z.string().optional(),
  itilcategories_id: z.number().optional(),
  _users_id_requester: z.string().optional(),
  _users_id_assign: z.string().optional(),
});

// --- Helpers ---

export function safeParse<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    loggers.cache.warn({ label, issues: result.error.issues }, 'Schema validation warning');
    return data as T;
  }
  return result.data;
}
