import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { readRoles, writeRoles } from '@/lib/roles';
import type { DashboardRole } from '@/types/roles';
import { ALL_PAGE_PATHS } from '@/types/roles';
import { loggers } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Slug format: lowercase alphanumeric + hyphens, 2-32 chars
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,31}$/;

/**
 * GET /api/settings/roles
 * Returns all configured roles.
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
    const roles = await readRoles();
    return NextResponse.json({ roles });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read roles' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/settings/roles
 * Create a new role.
 * Body: { id, name, adGroups, pages }
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
    const body = (await request.json()) as Partial<DashboardRole>;

    if (!body.id || !body.name) {
      return NextResponse.json({ error: 'Missing required fields: id, name' }, { status: 400 });
    }

    if (!SLUG_REGEX.test(body.id)) {
      return NextResponse.json(
        { error: 'Invalid id format. Must be lowercase alphanumeric with hyphens, 2-32 chars.' },
        { status: 400 },
      );
    }

    if (body.name.length > 64) {
      return NextResponse.json({ error: 'Role name must be 64 characters or less' }, { status: 400 });
    }

    if (body.adGroups && body.adGroups.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 AD groups per role' }, { status: 400 });
    }

    if (body.adGroups?.some((g) => g.length > 256)) {
      return NextResponse.json({ error: 'AD group names must be 256 characters or less' }, { status: 400 });
    }

    if (!body.pages || body.pages.length === 0) {
      return NextResponse.json({ error: 'At least one page must be selected' }, { status: 400 });
    }

    // Validate pages are valid paths
    const validPaths = new Set([...ALL_PAGE_PATHS, '/settings']);
    const invalidPages = body.pages.filter((p) => !validPaths.has(p));
    if (invalidPages.length > 0) {
      return NextResponse.json({ error: `Invalid pages: ${invalidPages.join(', ')}` }, { status: 400 });
    }

    const roles = await readRoles();

    // Check for duplicate id
    if (roles.some((r) => r.id === body.id)) {
      return NextResponse.json({ error: `Role with id '${body.id}' already exists` }, { status: 409 });
    }

    const newRole: DashboardRole = {
      id: body.id,
      name: body.name,
      adGroups: body.adGroups || [],
      pages: body.pages,
    };

    roles.push(newRole);
    await writeRoles(roles);

    loggers.auth.info({ roleId: newRole.id }, 'Role created');
    return NextResponse.json({ success: true, role: newRole }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create role' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/settings/roles
 * Update an existing role.
 * Body: { id, name?, adGroups?, pages? }
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
    const body = (await request.json()) as Partial<DashboardRole>;

    if (!body.id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    const roles = await readRoles();
    const idx = roles.findIndex((r) => r.id === body.id);

    if (idx === -1) {
      return NextResponse.json({ error: `Role '${body.id}' not found` }, { status: 404 });
    }

    const existing = roles[idx];

    // Protect system role constraints for admin
    if (existing.isSystem && existing.id === 'admin') {
      // Admin must always have all pages including /settings
      body.pages = [...ALL_PAGE_PATHS, '/settings'];
      // Prevent removing admin AD groups (would lock out all AD admins)
      body.adGroups = existing.adGroups;
    }

    if (body.pages && body.pages.length === 0) {
      return NextResponse.json({ error: 'At least one page must be selected' }, { status: 400 });
    }

    if (body.pages) {
      const validPaths = new Set([...ALL_PAGE_PATHS, '/settings']);
      const invalidPages = body.pages.filter((p) => !validPaths.has(p));
      if (invalidPages.length > 0) {
        return NextResponse.json({ error: `Invalid pages: ${invalidPages.join(', ')}` }, { status: 400 });
      }
    }

    // Merge fields
    roles[idx] = {
      ...existing,
      name: body.name ?? existing.name,
      adGroups: body.adGroups ?? existing.adGroups,
      pages: body.pages ?? existing.pages,
      isSystem: existing.isSystem, // Preserve isSystem — cannot be changed
    };

    await writeRoles(roles);

    loggers.auth.info({ roleId: body.id }, 'Role updated');
    return NextResponse.json({ success: true, role: roles[idx] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update role' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/settings/roles
 * Delete a role.
 * Body: { id }
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
    const body = (await request.json()) as { id: string };

    if (!body.id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    const roles = await readRoles();
    const idx = roles.findIndex((r) => r.id === body.id);

    if (idx === -1) {
      return NextResponse.json({ error: `Role '${body.id}' not found` }, { status: 404 });
    }

    if (roles[idx].isSystem) {
      return NextResponse.json({ error: `Cannot delete system role '${body.id}'` }, { status: 403 });
    }

    roles.splice(idx, 1);
    await writeRoles(roles);

    loggers.auth.info({ roleId: body.id }, 'Role deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete role' },
      { status: 500 },
    );
  }
}
