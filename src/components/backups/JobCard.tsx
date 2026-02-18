'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Progress } from '@/components/ui/progress';
import type { VeeamJob } from '@/types/veeam';

interface JobCardProps {
  job: VeeamJob;
  isWorking?: boolean;
  progress?: number;
}

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
    default:
      return result;
  }
}

export function JobCard({ job, isWorking, progress }: JobCardProps) {
  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground truncate mr-2">
            {job.name}
          </CardTitle>
          {job.isDisabled ? (
            <StatusBadge status="neutral" label="Desactive" />
          ) : (
            <StatusBadge
              status={resultToStatus(job.lastResult)}
              label={resultLabel(job.lastResult)}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{job.type}</p>

        {isWorking && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#00B336] font-medium">En cours...</span>
              {progress !== undefined && (
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              )}
            </div>
            <Progress value={progress ?? 0} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
