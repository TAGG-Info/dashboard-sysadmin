import { http, HttpResponse } from 'msw';

// Default mock handlers for API routes
export const handlers = [
  // PRTG
  http.get('*/api/prtg/devices', () => {
    return HttpResponse.json({
      data: [],
      _stale: false,
      _source: 'prtg',
      _timestamp: Date.now(),
    });
  }),

  // Veeam
  http.get('*/api/veeam/jobs', () => {
    return HttpResponse.json({
      data: [],
      _stale: false,
      _source: 'veeam',
      _timestamp: Date.now(),
    });
  }),

  http.get('*/api/veeam/summary', () => {
    return HttpResponse.json({
      data: {
        overview: {
          BackupServers: 1,
          ProxyServers: 1,
          RepositoryServers: 5,
          RunningJobs: 0,
          ScheduledJobs: 11,
          SuccessfulVmLastestStates: 96,
          WarningVmLastestStates: 0,
          FailedVmLastestStates: 0,
        },
        jobStats: {
          RunningJobs: 0,
          ScheduledJobs: 11,
          ScheduledBackupJobs: 11,
          ScheduledReplicaJobs: 0,
          TotalJobRuns: 33,
          SuccessfulJobRuns: 32,
          WarningsJobRuns: 1,
          FailedJobRuns: 0,
          MaxJobDuration: 3720,
          MaxBackupJobDuration: 3720,
          MaxDurationBackupJobName: 'Test Job',
        },
        vmsOverview: {
          ProtectedVms: 96,
          BackedUpVms: 96,
          ReplicatedVms: 0,
          RestorePoints: 142,
          FullBackupPointsSize: 0,
          IncrementalBackupPointsSize: 0,
          SourceVmsSize: 0,
          SuccessBackupPercents: 100,
        },
        processedVms: [],
        repositories: [],
      },
      _stale: false,
      _source: 'veeam',
      _timestamp: Date.now(),
    });
  }),

  // GLPI
  http.get('*/api/glpi/tickets', () => {
    return HttpResponse.json({
      data: [],
      _stale: false,
      _source: 'glpi',
      _timestamp: Date.now(),
    });
  }),

  // vCenter
  http.get('*/api/vcenter/vms', () => {
    return HttpResponse.json({
      data: [],
      _stale: false,
      _source: 'vcenter',
      _timestamp: Date.now(),
    });
  }),

  // SecureTransport logs
  http.get('*/api/securetransport/logs', () => {
    return HttpResponse.json({
      data: { transfers: [], resultSet: { returnCount: 0, totalCount: 0 } },
      _stale: false,
      _source: 'securetransport',
      _timestamp: Date.now(),
    });
  }),

  // Health
  http.get('*/api/health', () => {
    return HttpResponse.json({
      sources: [],
      timestamp: Date.now(),
    });
  }),
];
