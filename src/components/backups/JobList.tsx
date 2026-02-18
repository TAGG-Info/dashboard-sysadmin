'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { InstanceSectionHeader } from '@/components/ui/InstanceGroup';
import { TimeAgo } from '@/components/ui/TimeAgo';
import { useVeeamJobs, type VeeamJobWithInstance } from '@/hooks/useVeeam';

function resultToStatus(result?: string): 'healthy' | 'warning' | 'critical' | 'neutral' {
  if (!result) return 'neutral';
  switch (result.toLowerCase()) {
    case 'success':
      return 'healthy';
    case 'warning':
      return 'warning';
    case 'failed':
    case 'error':
      return 'critical';
    case 'none':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function resultLabel(result?: string): string {
  if (!result) return 'N/A';
  switch (result.toLowerCase()) {
    case 'success':
      return 'Success';
    case 'warning':
      return 'Warning';
    case 'failed':
      return 'Failed';
    case 'none':
      return 'Jamais execute';
    default:
      return result;
  }
}

export function JobList() {
  const { data: jobs, loading, error, refresh } = useVeeamJobs();

  const veeamUrl = process.env.NEXT_PUBLIC_VEEAM_URL;

  // Group by instance
  const instanceGroups = useMemo(() => {
    if (!jobs) return [];
    const map = new Map<string, { instanceName: string; items: VeeamJobWithInstance[] }>();
    for (const job of jobs) {
      const id = job._instanceId ?? 'default';
      const name = job._instanceName ?? '';
      if (!map.has(id)) {
        map.set(id, { instanceName: name, items: [] });
      }
      map.get(id)!.items.push(job);
    }
    return Array.from(map.entries());
  }, [jobs]);

  const hasMultipleInstances = instanceGroups.length > 1;

  if (error && !jobs) {
    return (
      <ErrorState
        title="Erreur Veeam Jobs"
        message={error.message}
        source="Veeam"
        onRetry={refresh}
      />
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        Jobs de backup
        {jobs && (
          <span className="ml-2 text-sm text-muted-foreground font-normal">
            ({jobs.length})
          </span>
        )}
      </h3>

      {instanceGroups.map(([instanceId, { instanceName, items }]) => (
        <div key={instanceId}>
          {hasMultipleInstances && (
            <InstanceSectionHeader instanceName={instanceName} className="mb-2" />
          )}
          <div className="rounded-lg border border-border/50 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-sm">Nom</TableHead>
                  <TableHead className="text-sm">Type</TableHead>
                  <TableHead className="text-sm">Dernier resultat</TableHead>
                  <TableHead className="text-sm">Dernier run</TableHead>
                  <TableHead className="text-sm text-center">Actif</TableHead>
                  <TableHead className="text-sm text-right w-[80px]">Lien</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      Aucun job configure
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((job) => (
                    <TableRow key={`${instanceId}-${job.id}`} className={job.isDisabled ? 'opacity-50' : ''}>
                      <TableCell className="text-sm font-medium">{job.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-sm">
                          {job.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={resultToStatus(job.lastResult)}
                          label={resultLabel(job.lastResult)}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {job.lastRun ? (
                          <TimeAgo date={job.lastRun} />
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {job.isDisabled ? (
                          <StatusBadge status="neutral" label="Desactive" />
                        ) : (
                          <StatusBadge status="healthy" label="Actif" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {veeamUrl && (
                          <ExternalLink
                            href={`${veeamUrl}`}
                            label="Veeam"
                            source="veeam"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}

      {/* Show loading skeletons when no data */}
      {loading && !jobs && instanceGroups.length === 0 && (
        <div className="rounded-lg border border-border/50 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-sm">Nom</TableHead>
                <TableHead className="text-sm">Type</TableHead>
                <TableHead className="text-sm">Dernier resultat</TableHead>
                <TableHead className="text-sm">Dernier run</TableHead>
                <TableHead className="text-sm text-center">Actif</TableHead>
                <TableHead className="text-sm text-right w-[80px]">Lien</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
