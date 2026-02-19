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
