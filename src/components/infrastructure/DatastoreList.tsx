'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatastoreBar } from '@/components/ui/DatastoreBar';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { InstanceSectionHeader } from '@/components/ui/InstanceGroup';
import { useVCenterDatastores } from '@/hooks/useInfrastructure';

function bytesToGB(bytes: number): number {
  return bytes / (1024 * 1024 * 1024);
}

export function DatastoreList() {
  const { data: datastores, loading, error, refresh } = useVCenterDatastores();

  // Group by instance
  const instanceGroups = useMemo(() => {
    if (!datastores) return [];
    const map = new Map<string, { instanceName: string; items: typeof datastores }>();
    for (const ds of datastores) {
      const id = ds._instanceId ?? 'default';
      const name = ds._instanceName ?? '';
      if (!map.has(id)) {
        map.set(id, { instanceName: name, items: [] });
      }
      map.get(id)!.items.push(ds);
    }
    return Array.from(map.entries());
  }, [datastores]);

  const hasMultipleInstances = instanceGroups.length > 1;

  if (error && !datastores) {
    return (
      <ErrorState
        title="Erreur Datastores"
        message={error.message}
        source="VMware"
        onRetry={refresh}
      />
    );
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Datastores
          {datastores && (
            <span className="ml-2 text-sm text-muted-foreground font-normal">
              ({datastores.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !datastores ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))
        ) : !datastores || datastores.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun datastore
          </p>
        ) : (
          instanceGroups.map(([instanceId, { instanceName, items }]) => (
            <div key={instanceId}>
              {hasMultipleInstances && (
                <InstanceSectionHeader instanceName={instanceName} className="mb-2" />
              )}
              {items
                .sort((a, b) => {
                  const usageA = ((a.capacity - a.free_space) / a.capacity) * 100;
                  const usageB = ((b.capacity - b.free_space) / b.capacity) * 100;
                  return usageB - usageA;
                })
                .map((ds) => {
                  const totalGB = bytesToGB(ds.capacity);
                  const usedGB = bytesToGB(ds.capacity - ds.free_space);
                  const percentage = ds.capacity > 0
                    ? ((ds.capacity - ds.free_space) / ds.capacity) * 100
                    : 0;

                  return (
                    <div key={`${instanceId}-${ds.datastore}`}>
                      <DatastoreBar
                        label={ds.name}
                        used={usedGB}
                        total={totalGB}
                        unit="GB"
                      />
                      {percentage > 85 && (
                        <p className="text-sm text-[#ef4444] mt-1">
                          Espace disque critique ({Math.round(percentage)}%)
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
