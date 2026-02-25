'use client';

import { useState, useMemo, useCallback } from 'react';
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { InstanceSectionHeader, groupByInstance, hasMultipleInstances } from '@/components/ui/InstanceGroup';
import { TimeAgo } from '@/components/ui/TimeAgo';
import { useColumnResize } from '@/hooks/useColumnResize';
import {
  resultToStatus,
  resultLabel,
  jobTypeLabel,
  jobTypeColor,
  jobStatusToLevel,
  jobStatusLabel,
} from '@/lib/status-mappers';
import { useVeeamJobs } from '@/hooks/useVeeam';
import type { VeeamJobWithInstance } from '@/hooks/useVeeam';
import { SourceLogo } from '@/components/ui/SourceLogo';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// --- Column definitions ---
const COLS = [
  { key: 'name', label: 'Nom', align: 'left' as const },
  { key: 'type', label: 'Type', align: 'left' as const },
  { key: 'objects', label: 'Objets', align: 'center' as const },
  { key: 'status', label: 'Statut', align: 'left' as const },
  { key: 'lastRun', label: 'Dernier run', align: 'left' as const },
  { key: 'lastResult', label: 'Dernier resultat', align: 'left' as const },
  { key: 'nextRun', label: 'Prochain run', align: 'left' as const },
  { key: 'target', label: 'Cible', align: 'left' as const },
] as const;

type ColKey = (typeof COLS)[number]['key'];

const DEFAULT_WIDTHS = [200, 130, 65, 85, 130, 125, 160, 200];

// --- Type filter options (raw type → label) ---
const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Backup', label: 'VMware Backup' },
  { value: 'HyperVBackup', label: 'Hyper-V Backup' },
  { value: 'EpAgentBackup', label: 'Agent Backup' },
  { value: 'BackupToTape', label: 'Backup to Tape' },
  { value: 'BackupCopy', label: 'Backup Copy' },
  { value: 'SimpleBackupCopyPolicy', label: 'Backup Copy' },
  { value: 'Replica', label: 'Replica' },
];

const RESULT_OPTIONS = ['Success', 'Warning', 'Failed', 'None'];
const STATUS_OPTIONS = ['Working', 'Stopped'];

// --- Helpers ---
function formatNextRun(nextRun?: string): string {
  if (!nextRun) return '\u2014';
  if (nextRun.startsWith('Apres ') || nextRun.startsWith('After ')) return nextRun;
  try {
    const d = parseISO(nextRun);
    return format(d, 'dd/MM/yyyy HH:mm', { locale: fr });
  } catch {
    return nextRun;
  }
}

function TypeBadge({ type }: { type?: string }) {
  const cls = jobTypeColor(type);
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}
    >
      {jobTypeLabel(type)}
    </span>
  );
}

// --- Sorting ---
type SortDir = 'asc' | 'desc';

function getSortValue(job: VeeamJobWithInstance, key: ColKey): string | number {
  switch (key) {
    case 'name':
      return job.name.toLowerCase();
    case 'type':
      return jobTypeLabel(job.type).toLowerCase();
    case 'objects':
      return job.objects ?? -1;
    case 'status':
      return job.status ?? '';
    case 'lastRun':
      return job.lastRun ?? '';
    case 'lastResult':
      return job.lastResult ?? '';
    case 'nextRun':
      return job.nextRun ?? '';
    case 'target':
      return (job.target ?? '').toLowerCase();
    default:
      return '';
  }
}

function sortJobs(jobs: VeeamJobWithInstance[], key: ColKey, dir: SortDir): VeeamJobWithInstance[] {
  return [...jobs].sort((a, b) => {
    const va = getSortValue(a, key);
    const vb = getSortValue(b, key);
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// --- Component ---
export function JobList() {
  const { data: jobs, loading, error, refresh } = useVeeamJobs();
  const { widths, startResize, resetWidths } = useColumnResize(DEFAULT_WIDTHS);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Sort
  const [sortKey, setSortKey] = useState<ColKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = useCallback(
    (key: ColKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey],
  );

  const hasFilters = searchName || filterType || filterResult || filterStatus;

  const clearFilters = useCallback(() => {
    setSearchName('');
    setFilterType('');
    setFilterResult('');
    setFilterStatus('');
  }, []);

  // Filter + sort
  const processedJobs = useMemo(() => {
    if (!jobs) return [];
    let filtered = jobs;

    if (searchName) {
      const q = searchName.toLowerCase();
      filtered = filtered.filter((j) => j.name.toLowerCase().includes(q));
    }
    if (filterType) {
      filtered = filtered.filter((j) => j.type === filterType);
    }
    if (filterResult) {
      filtered = filtered.filter((j) => (j.lastResult ?? 'None') === filterResult);
    }
    if (filterStatus) {
      filtered = filtered.filter((j) => (j.status ?? 'Stopped') === filterStatus);
    }

    if (sortKey) {
      filtered = sortJobs(filtered, sortKey, sortDir);
    }

    return filtered;
  }, [jobs, searchName, filterType, filterResult, filterStatus, sortKey, sortDir]);

  // Group by instance (after filter+sort)
  const instanceGroups = useMemo(() => groupByInstance(processedJobs), [processedJobs]);
  const multipleInstances = jobs ? hasMultipleInstances(jobs) : false;

  const tableWidth = widths.reduce((a, b) => a + b, 0);

  if (error && !jobs) {
    return <ErrorState title="Erreur Veeam Jobs" message={error.message} source="Veeam" onRetry={refresh} />;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-foreground flex items-center gap-2 text-base font-semibold">
          <SourceLogo source="veeam" size={16} />
          Jobs de backup
          {jobs && (
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              ({processedJobs.length}
              {processedJobs.length !== jobs.length ? ` / ${jobs.length}` : ''})
            </span>
          )}
        </h3>
        <button
          onClick={resetWidths}
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          title="Reinitialiser la largeur des colonnes"
        >
          Reset colonnes
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Nom du job..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="bg-muted/20 border-border/60 focus:ring-ring h-8 w-44 rounded border pr-3 pl-7 text-sm focus:ring-1 focus:outline-none"
          />
        </div>

        <Select value={filterType} onValueChange={(v) => setFilterType(v === '__all__' ? '' : v)}>
          <SelectTrigger className="bg-muted/20 border-border/60 h-8 w-auto min-w-[130px] text-sm">
            <SelectValue placeholder="Tous types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous types</SelectItem>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterResult} onValueChange={(v) => setFilterResult(v === '__all__' ? '' : v)}>
          <SelectTrigger className="bg-muted/20 border-border/60 h-8 w-auto min-w-[130px] text-sm">
            <SelectValue placeholder="Tous resultats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous resultats</SelectItem>
            {RESULT_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {resultLabel(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === '__all__' ? '' : v)}>
          <SelectTrigger className="bg-muted/20 border-border/60 h-8 w-auto min-w-[110px] text-sm">
            <SelectValue placeholder="Tous statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous statuts</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {jobStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground flex h-8 items-center gap-1 text-xs transition-colors"
          >
            <X className="h-3 w-3" />
            Reinitialiser
          </button>
        )}
      </div>

      {/* Tables by instance */}
      {instanceGroups.map(({ instanceId, instanceName, items }) => (
        <div key={instanceId}>
          {multipleInstances && <InstanceSectionHeader instanceName={instanceName} className="mb-2" />}
          <div className="border-border/60 max-h-[900px] overflow-auto rounded-lg border">
            <table className="table-fixed text-sm" style={{ width: tableWidth }}>
              <colgroup>
                {widths.map((w, i) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-border/60 bg-muted/20 border-b">
                  {COLS.map((col, i) => {
                    const isLast = i === COLS.length - 1;
                    const isSorted = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        className={`bg-muted/20 text-muted-foreground relative sticky top-0 z-10 px-3 py-2 text-xs font-medium select-none text-${col.align}`}
                      >
                        <button
                          onClick={() => handleSort(col.key)}
                          className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
                        >
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap">{col.label}</span>
                          {isSorted ? (
                            sortDir === 'asc' ? (
                              <ArrowUp className="h-3 w-3 shrink-0" />
                            ) : (
                              <ArrowDown className="h-3 w-3 shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-40" />
                          )}
                        </button>
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
                    <td colSpan={COLS.length} className="text-muted-foreground py-8 text-center text-sm">
                      {hasFilters ? 'Aucun job correspondant aux filtres' : 'Aucun job configure'}
                    </td>
                  </tr>
                ) : (
                  items.map((job) => (
                    <tr
                      key={`${instanceId}-${job.id}`}
                      className={`border-border/60 hover:bg-muted/10 border-b transition-colors ${job.isDisabled ? 'opacity-50' : ''}`}
                    >
                      <td className="text-foreground overflow-hidden px-3 py-1.5 text-xs font-medium">
                        <span className="block truncate">{job.name}</span>
                      </td>
                      <td className="overflow-hidden px-3 py-1.5">
                        <TypeBadge type={job.type} />
                      </td>
                      <td className="text-muted-foreground overflow-hidden px-3 py-1.5 text-center text-xs">
                        {job.objects ?? '\u2014'}
                      </td>
                      <td className="overflow-hidden px-3 py-1.5">
                        <StatusBadge status={jobStatusToLevel(job.status)} label={jobStatusLabel(job.status)} />
                      </td>
                      <td className="text-muted-foreground overflow-hidden px-3 py-1.5 text-xs">
                        {job.lastRun ? <TimeAgo date={job.lastRun} /> : <span>{'\u2014'}</span>}
                      </td>
                      <td className="overflow-hidden px-3 py-1.5">
                        <StatusBadge status={resultToStatus(job.lastResult)} label={resultLabel(job.lastResult)} />
                      </td>
                      <td className="text-muted-foreground overflow-hidden px-3 py-1.5 text-xs">
                        <span className="block truncate">{formatNextRun(job.nextRun)}</span>
                      </td>
                      <td className="text-muted-foreground overflow-hidden px-3 py-1.5 text-xs">
                        <span className="block truncate" title={job.target || ''}>
                          {job.target || '\u2014'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Loading skeletons */}
      {loading && !jobs && instanceGroups.length === 0 && (
        <div className="border-border/60 overflow-x-auto rounded-lg border">
          <table className="table-fixed text-sm" style={{ width: tableWidth }}>
            <colgroup>
              {widths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-border/60 bg-muted/20 border-b">
                {COLS.map((col) => (
                  <th
                    key={col.key}
                    className={`text-muted-foreground px-3 py-2 text-xs font-medium select-none text-${col.align}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-border/60 border-b">
                  {Array.from({ length: COLS.length }).map((_, j) => (
                    <td key={j} className="px-3 py-1.5">
                      <Skeleton className="h-3.5 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
