'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DashboardRole } from '@/types/roles';

interface UseRolesReturn {
  roles: DashboardRole[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createRole: (role: Omit<DashboardRole, 'isSystem'>) => Promise<string | null>;
  updateRole: (role: Partial<DashboardRole> & { id: string }) => Promise<string | null>;
  deleteRole: (id: string) => Promise<string | null>;
}

export function useRoles(): UseRolesReturn {
  const [roles, setRoles] = useState<DashboardRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/settings/roles');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors du chargement des roles');
      }
      const data = await res.json();
      setRoles(data.roles || []);
    } catch (err) {
      console.error('[useRoles] Failed to load roles:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const createRole = useCallback(
    async (role: Omit<DashboardRole, 'isSystem'>): Promise<string | null> => {
      try {
        const res = await fetch('/api/settings/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(role),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Erreur lors de la creation');
        }
        return null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(msg);
        return msg;
      } finally {
        await fetchRoles();
      }
    },
    [fetchRoles],
  );

  const updateRole = useCallback(
    async (role: Partial<DashboardRole> & { id: string }): Promise<string | null> => {
      try {
        const res = await fetch('/api/settings/roles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(role),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Erreur lors de la mise a jour');
        }
        return null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(msg);
        return msg;
      } finally {
        await fetchRoles();
      }
    },
    [fetchRoles],
  );

  const deleteRole = useCallback(
    async (id: string): Promise<string | null> => {
      try {
        const res = await fetch('/api/settings/roles', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Erreur lors de la suppression');
        }
        return null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(msg);
        return msg;
      } finally {
        await fetchRoles();
      }
    },
    [fetchRoles],
  );

  return { roles, loading, error, refresh: fetchRoles, createRole, updateRole, deleteRole };
}
