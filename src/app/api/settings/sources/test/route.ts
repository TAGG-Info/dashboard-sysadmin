import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSourceInstance, type SourceKey } from '@/lib/config';

export const dynamic = 'force-dynamic';

interface TestResult {
  success: boolean;
  latency: number;
  error?: string;
  version?: string;
}

const VALID_SOURCES: SourceKey[] = [
  'prtg', 'vcenter', 'proxmox', 'veeam', 'glpi', 'securetransport',
];

/**
 * POST /api/settings/sources/test
 * Body: { source: string, config: { ... } }
 * Tests connectivity to a source WITHOUT saving the config.
 * Works the same as before - config is passed directly, no instanceId needed.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { source, instanceId, config } = body as { source: string; instanceId?: string; config: Record<string, string> };

    if (!source || !config) {
      return NextResponse.json({ error: 'Missing source or config in body' }, { status: 400 });
    }

    if (!VALID_SOURCES.includes(source as SourceKey)) {
      return NextResponse.json(
        { error: `Unknown source: ${source}. Valid: ${VALID_SOURCES.join(', ')}` },
        { status: 400 },
      );
    }

    // Resolve **** values from saved config for existing instances
    const resolvedConfig = { ...config };
    if (instanceId) {
      const saved = await getSourceInstance(source as SourceKey, instanceId);
      if (saved) {
        for (const [key, value] of Object.entries(resolvedConfig)) {
          if (value === '****') {
            resolvedConfig[key] = (saved as unknown as Record<string, string>)[key] || '';
          }
        }
      }
    }

    const result = await testSource(source as SourceKey, resolvedConfig);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 },
    );
  }
}

async function testSource(
  source: SourceKey,
  config: Record<string, string>,
): Promise<TestResult> {
  const start = Date.now();

  try {
    switch (source) {
      case 'prtg':
        return await testPRTG(config, start);
      case 'vcenter':
        return await testVCenter(config, start);
      case 'proxmox':
        return await testProxmox(config, start);
      case 'veeam':
        return await testVeeam(config, start);
      case 'glpi':
        return await testGLPI(config, start);
      case 'securetransport':
        return await testSecureTransport(config, start);
      default:
        return { success: false, latency: Date.now() - start, error: `Unknown source: ${source}` };
    }
  } catch (error) {
    return {
      success: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

// PRTG: fetch /api/v2/experimental/devices?take=1 with Bearer token
async function testPRTG(config: Record<string, string>, start: number): Promise<TestResult> {
  const { baseUrl, apiKey } = config;
  if (!baseUrl || !apiKey) return { success: false, latency: 0, error: 'baseUrl and apiKey are required' };

  const res = await fetch(`${baseUrl}/api/v2/experimental/devices?take=1`, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return { success: true, latency: Date.now() - start };
}

// vCenter: POST /api/session with Basic auth, then DELETE session
async function testVCenter(config: Record<string, string>, start: number): Promise<TestResult> {
  const { baseUrl, username, password } = config;
  if (!baseUrl || !username || !password) {
    return { success: false, latency: 0, error: 'baseUrl, username, and password are required' };
  }

  const res = await fetch(`${baseUrl}/api/session`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const sessionId = await res.json();

  // Cleanup: delete session
  await fetch(`${baseUrl}/api/session`, {
    method: 'DELETE',
    headers: { 'vmware-api-session-id': sessionId },
  }).catch(() => {});

  return { success: true, latency: Date.now() - start };
}

// Proxmox: GET /api2/json/version with PVE token
async function testProxmox(config: Record<string, string>, start: number): Promise<TestResult> {
  const { baseUrl, tokenId, tokenSecret } = config;
  if (!baseUrl || !tokenId || !tokenSecret) {
    return { success: false, latency: 0, error: 'baseUrl, tokenId, and tokenSecret are required' };
  }

  const res = await fetch(`${baseUrl}/api2/json/version`, {
    headers: { 'Authorization': `PVEAPIToken=${tokenId}=${tokenSecret}` },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  const version = data?.data?.version || undefined;

  return { success: true, latency: Date.now() - start, version };
}

// Veeam: POST /api/oauth2/token with credentials
async function testVeeam(config: Record<string, string>, start: number): Promise<TestResult> {
  const { baseUrl, username, password } = config;
  if (!baseUrl || !username || !password) {
    return { success: false, latency: 0, error: 'baseUrl, username, and password are required' };
  }

  const res = await fetch(`${baseUrl}/api/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-api-version': '1.2-rev1',
    },
    body: `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return { success: true, latency: Date.now() - start };
}

// GLPI: GET /initSession with tokens
async function testGLPI(config: Record<string, string>, start: number): Promise<TestResult> {
  const { baseUrl, appToken, userToken } = config;
  if (!baseUrl || !appToken || !userToken) {
    return { success: false, latency: 0, error: 'baseUrl, appToken, and userToken are required' };
  }

  const res = await fetch(`${baseUrl}/initSession`, {
    headers: {
      'App-Token': appToken,
      'Authorization': `user_token ${userToken}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();

  // Cleanup: kill session
  if (data.session_token) {
    await fetch(`${baseUrl}/killSession`, {
      headers: { 'App-Token': appToken, 'Session-Token': data.session_token },
    }).catch(() => {});
  }

  return { success: true, latency: Date.now() - start };
}

// SecureTransport: GET /api/{version}/myself with Basic auth
async function testSecureTransport(config: Record<string, string>, start: number): Promise<TestResult> {
  const { baseUrl, username, password, apiVersion } = config;
  const version = apiVersion || 'v2.0';
  if (!baseUrl || !username || !password) {
    return { success: false, latency: 0, error: 'baseUrl, username, and password are required' };
  }

  const res = await fetch(`${baseUrl}/api/${version}/myself`, {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return { success: true, latency: Date.now() - start };
}
