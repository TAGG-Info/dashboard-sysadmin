'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SourceLogo } from '@/components/ui/SourceLogo';
import { useVeeamSummary } from '@/hooks/useVeeam';
import type { VeeamRepositoryReport } from '@/types/veeam';

function formatSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const tb = bytes / (1024 * 1024 * 1024 * 1024);
  if (tb >= 1) return `${tb.toFixed(1)} TB`;
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

function RepoBar({ repo }: { repo: VeeamRepositoryReport }) {
  const usedPercent = repo.Capacity > 0 ? ((repo.Capacity - repo.FreeSpace) / repo.Capacity) * 100 : 0;
  const backupPercent = repo.Capacity > 0 ? (repo.BackupSize / repo.Capacity) * 100 : 0;

  const barColor = usedPercent >= 90 ? '#ef4444' : usedPercent >= 75 ? '#f59e0b' : '#10b981';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-foreground text-[13px] font-medium">{repo.Name}</span>
        <span className="text-muted-foreground text-[11px]">
          {formatSize(repo.Capacity - repo.FreeSpace)} / {formatSize(repo.Capacity)}
        </span>
      </div>
      <div className="bg-muted h-2.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(usedPercent, 100)}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="text-muted-foreground flex justify-between text-[10px]">
        <span>
          Backups: {formatSize(repo.BackupSize)} ({backupPercent.toFixed(0)}%)
        </span>
        <span>Libre: {formatSize(repo.FreeSpace)}</span>
      </div>
    </div>
  );
}

export function RepositoryBars() {
  const { data: summary, loading } = useVeeamSummary();

  if (loading && !summary) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <SourceLogo source="veeam" size={18} />
            <CardTitle className="text-sm">Repositories</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-2.5 w-full rounded-full" />
                <Skeleton className="h-2 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const repos = summary?.repositories;
  if (!repos?.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-[22px] w-[22px] items-center justify-center rounded-md"
            style={{ background: 'rgba(76,175,80,0.12)' }}
          >
            <SourceLogo source="veeam" size={14} />
          </span>
          <CardTitle className="text-[13px] font-semibold">Repositories</CardTitle>
          <span className="text-muted-foreground text-[11px]">{repos.length} repos</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-5 lg:grid-cols-2">
          {repos.map((repo) => (
            <RepoBar key={repo.Name} repo={repo} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
