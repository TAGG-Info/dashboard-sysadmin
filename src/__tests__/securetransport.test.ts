import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecureTransportClient } from '@/lib/securetransport';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeClient() {
  return new SecureTransportClient({
    id: 'st-test',
    name: 'ST Test',
    baseUrl: 'https://st.example.com',
    username: 'admin',
    password: 'secret',
    apiVersion: 'v2.0',
  });
}

function mockFetch(responses: object[]) {
  let call = 0;
  vi.stubGlobal('fetch', vi.fn(async () => {
    const body = responses[call++ % responses.length];
    return {
      ok: true,
      json: async () => body,
    } as Response;
  }));
}

// ─── Reverse pagination ────────────────────────────────────────────────────────

describe('SecureTransportClient.getTransferLogs — reverse pagination', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('quand totalCount=100, limit=50, offset=0 → stOffset=50 (dernières 50)', async () => {
    // First call = count (limit=1), second call = data
    mockFetch([
      { resultSet: { totalCount: 100 } },
      { resultSet: { returnCount: 50, totalCount: 100 }, result: [] },
    ]);

    const client = makeClient();
    await client.getTransferLogs(50, 0);

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const dataCallUrl = fetchMock.mock.calls[1][0] as string;
    const params = new URL(dataCallUrl).searchParams;
    expect(params.get('offset')).toBe('50'); // totalCount(100) - limit(50) - offset(0)
    expect(params.get('limit')).toBe('50');
  });

  it('quand totalCount=100, limit=50, offset=50 → stOffset=0 (premières 50)', async () => {
    mockFetch([
      { resultSet: { totalCount: 100 } },
      { resultSet: { returnCount: 50, totalCount: 100 }, result: [] },
    ]);

    const client = makeClient();
    await client.getTransferLogs(50, 50);

    const fetchMock = vi.mocked(fetch);
    const dataCallUrl = fetchMock.mock.calls[1][0] as string;
    const params = new URL(dataCallUrl).searchParams;
    expect(params.get('offset')).toBe('0'); // totalCount(100) - limit(50) - offset(50) = 0
  });

  it('quand totalCount < limit → actualLimit réduit à totalCount', async () => {
    mockFetch([
      { resultSet: { totalCount: 30 } },
      { resultSet: { returnCount: 30, totalCount: 30 }, result: [] },
    ]);

    const client = makeClient();
    await client.getTransferLogs(50, 0);

    const fetchMock = vi.mocked(fetch);
    const dataCallUrl = fetchMock.mock.calls[1][0] as string;
    const params = new URL(dataCallUrl).searchParams;
    expect(params.get('limit')).toBe('30'); // min(50, 30-0)
    expect(params.get('offset')).toBe('0');
  });

  it('quand offset >= totalCount → retourne liste vide sans appel data', async () => {
    mockFetch([
      { resultSet: { totalCount: 20 } },
    ]);

    const client = makeClient();
    const result = await client.getTransferLogs(50, 20);

    const fetchMock = vi.mocked(fetch);
    // Seul l'appel count a été fait (+ 0 appel data)
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.transfers).toEqual([]);
    expect(result.resultSet.totalCount).toBe(20);
  });

  it('les résultats sont inversés (newest first)', async () => {
    const fakeTransfers = [
      { id: { mTransferStartTime: 1000 }, account: 'old' },
      { id: { mTransferStartTime: 2000 }, account: 'new' },
    ];
    mockFetch([
      { resultSet: { totalCount: 2 } },
      { resultSet: { returnCount: 2, totalCount: 2 }, result: fakeTransfers },
    ]);

    const client = makeClient();
    const result = await client.getTransferLogs(50, 0);

    // ST renvoie oldest first → après .reverse() on attend newest first
    expect(result.transfers[0].account).toBe('new');
    expect(result.transfers[1].account).toBe('old');
  });
});

// ─── knownTotalCount — skip count call ────────────────────────────────────────

describe('SecureTransportClient.getTransferLogs — knownTotalCount', () => {
  beforeEach(() => vi.restoreAllMocks());

  it("saute l'appel count quand knownTotalCount est fourni", async () => {
    mockFetch([
      { resultSet: { returnCount: 50, totalCount: 100 }, result: [] },
    ]);

    const client = makeClient();
    await client.getTransferLogs(50, 0, {}, 100);

    // Un seul appel (pas de count)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('utilise knownTotalCount pour le calcul du stOffset', async () => {
    mockFetch([
      { resultSet: { returnCount: 50, totalCount: 200 }, result: [] },
    ]);

    const client = makeClient();
    await client.getTransferLogs(50, 0, {}, 200);

    const dataCallUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    const params = new URL(dataCallUrl).searchParams;
    expect(params.get('offset')).toBe('150'); // 200 - 50 - 0
  });
});

// ─── buildFilterParams — dates RFC2822 ────────────────────────────────────────

describe('SecureTransportClient — paramètres de filtre', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('convertit startDate ms en startTimeAfter RFC2822', async () => {
    // Ne pas passer knownTotalCount → fait un appel count, puis totalCount=0 → retour immédiat
    mockFetch([
      { resultSet: { totalCount: 0 } },
    ]);

    const client = makeClient();
    const startMs = new Date('2026-02-18T00:00:00Z').getTime();
    await client.getTransferLogs(50, 0, { startDate: startMs });

    const countCallUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    const params = new URL(countCallUrl).searchParams;
    const startTimeAfter = params.get('startTimeAfter');
    expect(startTimeAfter).toBeTruthy();
    expect(new Date(startTimeAfter!).getTime()).toBe(startMs);
  });

  it('inclut le filtre account dans la query string', async () => {
    mockFetch([
      { resultSet: { totalCount: 0 } },
    ]);

    const client = makeClient();
    await client.getTransferLogs(50, 0, { account: 'alice' });

    const countCallUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    const params = new URL(countCallUrl).searchParams;
    expect(params.get('account')).toBe('*alice*'); // wildcards ajoutés automatiquement pour substring search
  });

  it('inclut incoming=false quand direction sortante', async () => {
    mockFetch([
      { resultSet: { totalCount: 0 } },
    ]);

    const client = makeClient();
    await client.getTransferLogs(50, 0, { incoming: false });

    const countCallUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    const params = new URL(countCallUrl).searchParams;
    expect(params.get('incoming')).toBe('false');
  });
});

// ─── Erreur HTTP ───────────────────────────────────────────────────────────────

describe('SecureTransportClient — gestion erreurs', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('rejette avec un message clair si ST renvoie 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    } as Response)));

    const client = makeClient();
    await expect(client.getTransferLogsCount()).rejects.toThrow('SecureTransport error: 401');
  });

  it('rejette avec un message clair si ST renvoie 500', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response)));

    const client = makeClient();
    await expect(client.getTransferLogsCount()).rejects.toThrow('SecureTransport error: 500');
  });
});
