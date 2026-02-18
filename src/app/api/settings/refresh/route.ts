import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { readRefreshIntervals, writeRefreshIntervals, MIN_INTERVAL, type RefreshKey } from '@/lib/refresh-intervals';

export const dynamic = 'force-dynamic';

const VALID_KEYS: RefreshKey[] = ['prtg', 'infra', 'veeam', 'tickets', 'transfers'];

/**
 * GET /api/settings/refresh
 * Returns current refresh intervals. Any authenticated user can read.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const intervals = await readRefreshIntervals();
    return NextResponse.json({ intervals });
  } catch {
    return NextResponse.json({ error: 'Failed to read refresh intervals' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/refresh
 * Updates refresh intervals. Admin only.
 * Body: { intervals: Partial<RefreshIntervals> }
 */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const input = body?.intervals;

    if (!input || typeof input !== 'object') {
      return NextResponse.json({ error: 'Missing intervals object' }, { status: 400 });
    }

    // Validate each provided value
    const partial: Partial<Record<RefreshKey, number>> = {};
    for (const key of VALID_KEYS) {
      if (key in input) {
        const val = input[key];
        if (typeof val !== 'number' || val < MIN_INTERVAL) {
          return NextResponse.json(
            { error: `${key}: must be a number >= ${MIN_INTERVAL}ms (${MIN_INTERVAL / 1000}s)` },
            { status: 400 },
          );
        }
        partial[key] = val;
      }
    }

    const result = await writeRefreshIntervals(partial);
    return NextResponse.json({ intervals: result });
  } catch {
    return NextResponse.json({ error: 'Failed to save refresh intervals' }, { status: 500 });
  }
}
