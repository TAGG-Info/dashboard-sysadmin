import { createSummaryApiRoute } from '@/lib/api-handler';
import { getVeeamClient } from '@/lib/veeam';
import { CACHE_TTL } from '@/lib/constants';
import type { VeeamSummary } from '@/types/veeam';

export const dynamic = 'force-dynamic';

export const GET = createSummaryApiRoute<'veeam', VeeamSummary, VeeamSummary>({
  source: 'veeam',
  getCacheKey: (instanceId) => `dashboard:veeam:${instanceId}:summary`,
  ttlMs: CACHE_TTL.VEEAM,
  fetcher: (instance) => getVeeamClient(instance).getSummary(),
  aggregator: (results) => {
    if (results.length === 1) return results[0];

    // Multi-instance: sum numeric fields, concat arrays
    const aggregated: VeeamSummary = {
      overview: {
        BackupServers: 0,
        ProxyServers: 0,
        RepositoryServers: 0,
        RunningJobs: 0,
        ScheduledJobs: 0,
        SuccessfulVmLastestStates: 0,
        WarningVmLastestStates: 0,
        FailedVmLastestStates: 0,
      },
      jobStats: {
        RunningJobs: 0,
        ScheduledJobs: 0,
        ScheduledBackupJobs: 0,
        ScheduledReplicaJobs: 0,
        TotalJobRuns: 0,
        SuccessfulJobRuns: 0,
        WarningsJobRuns: 0,
        FailedJobRuns: 0,
        MaxJobDuration: 0,
        MaxBackupJobDuration: 0,
        MaxDurationBackupJobName: '',
      },
      vmsOverview: {
        ProtectedVms: 0,
        BackedUpVms: 0,
        ReplicatedVms: 0,
        RestorePoints: 0,
        FullBackupPointsSize: 0,
        IncrementalBackupPointsSize: 0,
        SourceVmsSize: 0,
        SuccessBackupPercents: 0,
      },
      processedVms: [],
      repositories: [],
    };

    for (const r of results) {
      for (const key of Object.keys(aggregated.overview) as (keyof VeeamSummary['overview'])[]) {
        aggregated.overview[key] += r.overview[key];
      }
      for (const key of Object.keys(aggregated.jobStats) as (keyof VeeamSummary['jobStats'])[]) {
        if (key === 'MaxDurationBackupJobName') continue;
        (aggregated.jobStats[key] as number) += r.jobStats[key] as number;
      }
      if (r.jobStats.MaxJobDuration > aggregated.jobStats.MaxJobDuration) {
        aggregated.jobStats.MaxDurationBackupJobName = r.jobStats.MaxDurationBackupJobName;
      }
      for (const key of Object.keys(aggregated.vmsOverview) as (keyof VeeamSummary['vmsOverview'])[]) {
        aggregated.vmsOverview[key] += r.vmsOverview[key];
      }
      aggregated.processedVms.push(...(r.processedVms ?? []));
      aggregated.repositories.push(...(r.repositories ?? []));
    }

    // Weighted average for SuccessBackupPercents
    if (results.length > 1) {
      const totalVms = results.reduce((s, r) => s + r.vmsOverview.BackedUpVms, 0);
      aggregated.vmsOverview.SuccessBackupPercents =
        totalVms > 0
          ? results.reduce((s, r) => s + r.vmsOverview.SuccessBackupPercents * r.vmsOverview.BackedUpVms, 0) / totalVms
          : 0;
    }

    return aggregated;
  },
});
