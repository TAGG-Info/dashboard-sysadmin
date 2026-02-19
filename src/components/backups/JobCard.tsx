'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { resultToStatus, resultLabel } from '@/lib/status-mappers';
import type { VeeamJob } from '@/types/veeam';

interface JobCardProps {
  job: VeeamJob;
  isWorking?: boolean;
  progress?: number;
}

export function JobCard({ job, isWorking, progress }: JobCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground mr-2 truncate text-sm font-medium">{job.name}</CardTitle>
          {job.isDisabled ? (
            <StatusBadge status="neutral" label="Desactive" />
          ) : (
            <StatusBadge status={resultToStatus(job.lastResult)} label={resultLabel(job.lastResult)} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">{job.type}</p>

        {isWorking && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[#00B336]">En cours...</span>
              {progress !== undefined && <span className="text-muted-foreground">{Math.round(progress)}%</span>}
            </div>
            <Progress value={progress ?? 0} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
