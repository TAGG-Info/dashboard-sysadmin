import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSourceConfig } from '@/lib/config';
import { getSTClient } from '@/lib/securetransport';
import { cacheGet, cacheSet, cacheGetStale } from '@/lib/cache';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const instances = await getSourceConfig('securetransport');
  if (!instances.length) {
    return NextResponse.json({ error: 'No SecureTransport instances configured', source: 'securetransport' }, { status: 502 });
  }

  const results = await Promise.allSettled(
    instances.map(async (instance) => {
      const cacheKey = `dashboard:st:${instance.id}:summary`;

      const cached = await cacheGet<Record<string, unknown>>(cacheKey);
      if (cached) {
        return { ...cached, _instanceId: instance.id, _instanceName: instance.name };
      }

      try {
        const client = getSTClient(instance);
        const summary = await client.getSummary();
        await cacheSet(cacheKey, summary, CACHE_TTL.ST);
        return { ...summary, _instanceId: instance.id, _instanceName: instance.name };
      } catch (error) {
        const stale = await cacheGetStale<Record<string, unknown>>(cacheKey);
        if (stale) {
          return { ...stale, _instanceId: instance.id, _instanceName: instance.name, _stale: true };
        }
        throw error;
      }
    })
  );

  const fulfilled = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<Record<string, unknown>>[];
  const summaries = fulfilled.map(r => r.value);
  const hasErrors = results.some(r => r.status === 'rejected');
  const isStale = summaries.some(d => d._stale === true);

  // Aggregate all instance summaries into a single combined summary
  const aggregated = {
    accounts: { total: 0, active: 0, disabled: 0 },
    certificates: {
      total: 0,
      expiringSoon: [] as { alias: string; notAfter: string; _instanceName?: string }[],
    },
    sites: { total: 0 },
  };

  for (const s of summaries) {
    const accounts = s.accounts as { total: number; active: number; disabled: number } | undefined;
    if (accounts) {
      aggregated.accounts.total += accounts.total || 0;
      aggregated.accounts.active += accounts.active || 0;
      aggregated.accounts.disabled += accounts.disabled || 0;
    }

    const certs = s.certificates as { total: number; expiringSoon: { alias: string; notAfter: string }[] } | undefined;
    if (certs) {
      aggregated.certificates.total += certs.total || 0;
      if (certs.expiringSoon) {
        aggregated.certificates.expiringSoon.push(
          ...certs.expiringSoon.map(c => ({ ...c, _instanceName: s._instanceName as string }))
        );
      }
    }

    const sites = s.sites as { total: number } | undefined;
    if (sites) {
      aggregated.sites.total += sites.total || 0;
    }
  }

  // Sort expiring certs by date (soonest first)
  aggregated.certificates.expiringSoon.sort(
    (a, b) => new Date(a.notAfter).getTime() - new Date(b.notAfter).getTime()
  );

  return NextResponse.json({
    data: aggregated,
    _stale: isStale,
    _source: 'securetransport',
    _timestamp: Date.now(),
    _partial: hasErrors && summaries.length > 0,
  });
}
