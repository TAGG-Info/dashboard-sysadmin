import { createSummaryApiRoute, type InstanceResult } from '@/lib/api-handler';
import { getSTClient } from '@/lib/securetransport';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

interface STSummaryRaw {
  accounts: { total: number; active: number; disabled: number };
  certificates: {
    total: number;
    expiringSoon: { alias: string; notAfter: string }[];
  };
  sites: { total: number };
}

interface STSummaryAggregated {
  accounts: { total: number; active: number; disabled: number };
  certificates: {
    total: number;
    expiringSoon: { alias: string; notAfter: string; _instanceName?: string }[];
  };
  sites: { total: number };
}

export const GET = createSummaryApiRoute<'securetransport', STSummaryRaw, STSummaryAggregated>({
  source: 'securetransport',
  getCacheKey: (instanceId) => `dashboard:st:${instanceId}:summary`,
  ttlMs: CACHE_TTL.ST,
  fetcher: async (instance) => {
    const client = getSTClient(instance);
    return await client.getSummary() as STSummaryRaw;
  },
  aggregator: (results: InstanceResult<STSummaryRaw>[]) => {
    const aggregated: STSummaryAggregated = {
      accounts: { total: 0, active: 0, disabled: 0 },
      certificates: { total: 0, expiringSoon: [] },
      sites: { total: 0 },
    };

    for (const s of results) {
      if (s.accounts) {
        aggregated.accounts.total += s.accounts.total || 0;
        aggregated.accounts.active += s.accounts.active || 0;
        aggregated.accounts.disabled += s.accounts.disabled || 0;
      }

      if (s.certificates) {
        aggregated.certificates.total += s.certificates.total || 0;
        if (s.certificates.expiringSoon) {
          aggregated.certificates.expiringSoon.push(
            ...s.certificates.expiringSoon.map(c => ({ ...c, _instanceName: s._instanceName }))
          );
        }
      }

      if (s.sites) {
        aggregated.sites.total += s.sites.total || 0;
      }
    }

    // Sort expiring certs by date (soonest first)
    aggregated.certificates.expiringSoon.sort(
      (a, b) => new Date(a.notAfter).getTime() - new Date(b.notAfter).getTime()
    );

    return aggregated;
  },
});
