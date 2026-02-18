import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { readConfig, writeConfig, SENSITIVE_FIELDS, type SourceConfig, type SourceKey } from '@/lib/config';

export const dynamic = 'force-dynamic';

// Required fields per source (for PUT validation)
const REQUIRED_FIELDS: Record<SourceKey, string[]> = {
  prtg: ['baseUrl', 'apiKey'],
  vcenter: ['baseUrl', 'username', 'password'],
  proxmox: ['baseUrl', 'tokenId', 'tokenSecret'],
  veeam: ['baseUrl', 'username', 'password'],
  glpi: ['baseUrl', 'appToken', 'userToken'],
  securetransport: ['baseUrl', 'username', 'password'],
};

/**
 * GET /api/settings/sources
 * Returns all source configs with sensitive fields masked as "****"
 * Now returns arrays of instances per source.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const config = await readConfig();

    // Mask sensitive fields in each instance
    const masked: SourceConfig = {};
    for (const [source, sensitiveKeys] of Object.entries(SENSITIVE_FIELDS)) {
      const srcKey = source as SourceKey;
      const instances = config[srcKey];
      if (!instances || !Array.isArray(instances)) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (masked as any)[srcKey] = (instances as any[]).map((instance) => {
        const copy = { ...instance } as Record<string, string>;
        for (const field of sensitiveKeys) {
          if (copy[field]) copy[field] = '****';
        }
        return copy;
      });
    }

    return NextResponse.json({ config: masked });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read config' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/settings/sources
 * Body: { source: string, instanceId?: string, config: { ... } }
 * - If instanceId is provided, update that specific instance
 * - If instanceId is not provided, create a new instance with a generated id
 * - If a field value is "****", keep the existing value.
 */
export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { source, instanceId, config: incoming } = body as {
      source: string;
      instanceId?: string;
      config: Record<string, string>;
    };

    if (!source || !incoming) {
      return NextResponse.json({ error: 'Missing source or config in body' }, { status: 400 });
    }

    const srcKey = source as SourceKey;
    if (!REQUIRED_FIELDS[srcKey]) {
      return NextResponse.json(
        { error: `Unknown source: ${source}. Valid: ${Object.keys(REQUIRED_FIELDS).join(', ')}` },
        { status: 400 },
      );
    }

    // Read existing config
    const existing = await readConfig();
    const existingInstances = (existing[srcKey] || []) as unknown as Record<string, string>[];

    if (instanceId) {
      // Update existing instance
      const idx = existingInstances.findIndex(i => i.id === instanceId);
      if (idx === -1) {
        return NextResponse.json(
          { error: `Instance '${instanceId}' not found for source '${source}'` },
          { status: 404 },
        );
      }

      const existingSrc = existingInstances[idx];

      // Validate required fields
      const missingFields = REQUIRED_FIELDS[srcKey].filter((f) => {
        const val = incoming[f];
        if (!val) return true;
        if (val === '****') return !existingSrc[f];
        return false;
      });

      if (missingFields.length > 0) {
        return NextResponse.json(
          { error: `Missing required fields: ${missingFields.join(', ')}` },
          { status: 400 },
        );
      }

      // Merge: if incoming field is "****", keep existing value
      const merged: Record<string, string> = {};
      for (const [key, value] of Object.entries(incoming)) {
        merged[key] = value === '****' ? (existingSrc[key] || '') : value;
      }
      // Preserve id and name
      merged.id = instanceId;
      merged.name = incoming.name || existingSrc.name || instanceId;

      existingInstances[idx] = merged;
    } else {
      // Create new instance
      const id = incoming.id || `${source}-${Date.now().toString(36)}`;
      const name = incoming.name || id;

      // Validate required fields (no "****" allowed for new instances)
      const missingFields = REQUIRED_FIELDS[srcKey].filter((f) => {
        const val = incoming[f];
        return !val || val === '****';
      });

      if (missingFields.length > 0) {
        return NextResponse.json(
          { error: `Missing required fields: ${missingFields.join(', ')}` },
          { status: 400 },
        );
      }

      // Check for duplicate id
      if (existingInstances.some(i => i.id === id)) {
        return NextResponse.json(
          { error: `Instance with id '${id}' already exists for source '${source}'` },
          { status: 409 },
        );
      }

      existingInstances.push({ ...incoming, id, name });
    }

    // Write back full config with the updated source instances
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fullConfig = { ...existing, [srcKey]: existingInstances } as any;
    await writeConfig(fullConfig);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save config' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/settings/sources
 * Body: { source: string, instanceId: string }
 * Removes a specific instance from a source.
 */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { source, instanceId } = body as { source: string; instanceId: string };

    if (!source || !instanceId) {
      return NextResponse.json({ error: 'Missing source or instanceId in body' }, { status: 400 });
    }

    const srcKey = source as SourceKey;
    if (!REQUIRED_FIELDS[srcKey]) {
      return NextResponse.json(
        { error: `Unknown source: ${source}. Valid: ${Object.keys(REQUIRED_FIELDS).join(', ')}` },
        { status: 400 },
      );
    }

    const existing = await readConfig();
    const existingInstances = (existing[srcKey] || []) as unknown as Record<string, string>[];
    const idx = existingInstances.findIndex(i => i.id === instanceId);

    if (idx === -1) {
      return NextResponse.json(
        { error: `Instance '${instanceId}' not found for source '${source}'` },
        { status: 404 },
      );
    }

    existingInstances.splice(idx, 1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fullConfig = { ...existing, [srcKey]: existingInstances } as any;
    await writeConfig(fullConfig);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete instance' },
      { status: 500 },
    );
  }
}
