'use client';

import { useState, useEffect } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TimeAgoProps {
  date: string | Date;
  className?: string;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffSec < 10) return "a l'instant";
  if (diffSec < 60) return `il y a ${diffSec}s`;
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffH < 24) return `il y a ${diffH}h`;
  if (diffD < 7) return `il y a ${diffD}j`;
  return date.toLocaleDateString('fr-FR');
}

function formatFullDate(date: Date): string {
  return date.toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function TimeAgo({ date, className }: TimeAgoProps) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const [display, setDisplay] = useState(formatTimeAgo(dateObj));

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(formatTimeAgo(dateObj));
    }, 15000); // Update every 15 seconds

    return () => clearInterval(interval);
  }, [dateObj]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time
          dateTime={dateObj.toISOString()}
          className={cn('text-muted-foreground cursor-default text-sm', className)}
        >
          {display}
        </time>
      </TooltipTrigger>
      <TooltipContent>
        <p>{formatFullDate(dateObj)}</p>
      </TooltipContent>
    </Tooltip>
  );
}
