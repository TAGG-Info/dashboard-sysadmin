'use client';

import { useMemo } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { InstanceSectionHeader, groupByInstance, hasMultipleInstances } from '@/components/ui/InstanceGroup';
import { TimeAgo } from '@/components/ui/TimeAgo';
import { useColumnResize } from '@/hooks/useColumnResize';
import { resultToStatus, resultLabel } from '@/lib/status-mappers';
import { useVeeamJobs } from '@/hooks/useVeeam';
import { SourceLogo } from '@/components/ui/SourceLogo';

const COLS = [
  { label: 'Nom', align: 'left' as const },
  { label: 'Type', align: 'left' as const },
  { label: 'Dernier resultat', align: 'left' as const },
  { label: 'Dernier run', align: 'left' as const },
  { label: 'Actif', align: 'center' as const },
  { label: 'Lien', align: 'right' as const },
] as const;

const DEFAULT_WIDTHS = [220, 100, 130, 140, 100, 80];

export function JobList() {
  const { data: jobs, loading, error, refresh } = useVeeamJobs();
  const { widths, startResize, resetWidths } = useColumnResize(DEFAULT_WIDTHS);

  const veeamUrl = process.env.NEXT_PUBLIC_VEEAM_URL;

  // Group by instance
  const instanceGroups = useMemo(() => {
    if (!jobs) return [];
    return groupByInstance(jobs);
  }, [jobs]);

  const multipleInstances = jobs ? hasMultipleInstances(jobs) : false;

  const tableWidth = widths.reduce((a, b) => a + b, 0);

  if (error && !jobs) {
    return <ErrorState title="Erreur Veeam Jobs" message={error.message} source="Veeam" onRetry={refresh} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <SourceLogo source="veeam" size={16} />
          Jobs de backup
          {jobs && <span className="text-muted-foreground ml-2 text-sm font-normal">({jobs.length})</span>}
        </h3>
        <button
          onClick={resetWidths}
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          title="Reinitialiser la largeur des colonnes"
        >
          Reset colonnes
        </button>
      </div>

      {instanceGroups.map(({ instanceId, instanceName, items }) => (
        <div key={instanceId}>
          {multipleInstances && <InstanceSectionHeader instanceName={instanceName} className="mb-2" />}
          <div className="border-border/50 overflow-x-auto rounded-lg border">
            <table className="table-fixed text-sm" style={{ width: tableWidth }}>
              <colgroup>
                {widths.map((w, i) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-border/50 bg-muted/20 border-b">
                  {COLS.map((col, i) => {
                    const isLast = i === COLS.length - 1;
                    return (
                      <th
                        key={col.label}
                        className={`text-muted-foreground relative px-3 py-2 text-xs font-medium select-none text-${col.align}`}
                      >
                        <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{col.label}</span>
                        {!isLast && (
                          <div
                            onPointerDown={(e) => startResize(e, i)}
                            className="group absolute top-0 right-0 h-full w-1.5 cursor-col-resize"
                          >
                            <div className="bg-border/0 group-hover:bg-border/60 mx-auto h-full w-px transition-colors" />
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground py-8 text-center text-sm">
                      Aucun job configure
                    </td>
                  </tr>
                ) : (
                  items.map((job) => (
                    <tr
                      key={`${instanceId}-${job.id}`}
                      className={`border-border/30 hover:bg-muted/10 border-b transition-colors ${job.isDisabled ? 'opacity-50' : ''}`}
                    >
                      <td className="text-foreground overflow-hidden px-3 py-1.5 text-xs font-medium">
                        <span className="block truncate">{job.name}</span>
                      </td>
                      <td className="overflow-hidden px-3 py-1.5">
                        <Badge variant="outline" className="text-xs">
                          {job.type}
                        </Badge>
                      </td>
                      <td className="overflow-hidden px-3 py-1.5">
                        <StatusBadge status={resultToStatus(job.lastResult)} label={resultLabel(job.lastResult)} />
                      </td>
                      <td className="text-muted-foreground overflow-hidden px-3 py-1.5 text-xs">
                        {job.lastRun ? <TimeAgo date={job.lastRun} /> : <span>{'\u2014'}</span>}
                      </td>
                      <td className="overflow-hidden px-3 py-1.5 text-center">
                        {job.isDisabled ? (
                          <StatusBadge status="neutral" label="Desactive" />
                        ) : (
                          <StatusBadge status="healthy" label="Actif" />
                        )}
                      </td>
                      <td className="overflow-hidden px-3 py-1.5 text-right">
                        {veeamUrl && <ExternalLink href={`${veeamUrl}`} label="Veeam" source="veeam" />}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Show loading skeletons when no data */}
      {loading && !jobs && instanceGroups.length === 0 && (
        <div className="border-border/50 overflow-x-auto rounded-lg border">
          <table className="table-fixed text-sm" style={{ width: tableWidth }}>
            <colgroup>
              {widths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-border/50 bg-muted/20 border-b">
                {COLS.map((col) => (
                  <th
                    key={col.label}
                    className={`text-muted-foreground px-3 py-2 text-xs font-medium select-none text-${col.align}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-border/30 border-b">
                  <td className="px-3 py-1.5">
                    <Skeleton className="h-3.5 w-40" />
                  </td>
                  <td className="px-3 py-1.5">
                    <Skeleton className="h-3.5 w-20" />
                  </td>
                  <td className="px-3 py-1.5">
                    <Skeleton className="h-3.5 w-16" />
                  </td>
                  <td className="px-3 py-1.5">
                    <Skeleton className="h-3.5 w-24" />
                  </td>
                  <td className="px-3 py-1.5">
                    <Skeleton className="mx-auto h-3.5 w-12" />
                  </td>
                  <td className="px-3 py-1.5">
                    <Skeleton className="h-3.5 w-12" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
