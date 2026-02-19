'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useVeeamSessions } from '@/hooks/useVeeam';
import { Skeleton } from '@/components/ui/skeleton';
import { SourceLogo } from '@/components/ui/SourceLogo';
import { cn } from '@/lib/utils';

type DayStatus = 'success' | 'warning' | 'failed' | 'none';

function getDayColor(status: DayStatus): string {
  switch (status) {
    case 'success':
      return '#10b981';
    case 'warning':
      return '#f59e0b';
    case 'failed':
      return '#ef4444';
    case 'none':
    default:
      return '#1e1e26';
  }
}

function getDayLabel(status: DayStatus): string {
  switch (status) {
    case 'success':
      return 'Tous OK';
    case 'warning':
      return 'Warning(s)';
    case 'failed':
      return 'Echec(s)';
    case 'none':
    default:
      return 'Pas de backup';
  }
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function BackupCalendar() {
  const { data: sessions, loading } = useVeeamSessions();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Build a map of day -> worst status
  const dayStatusMap = useMemo(() => {
    const map: Record<string, DayStatus> = {};
    if (!sessions) return map;

    sessions.forEach((session) => {
      const date = new Date(session.creationTime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const result = session.result.result.toLowerCase();

      const currentStatus = map[key] || 'none';

      if (result === 'failed' || result === 'error') {
        map[key] = 'failed';
      } else if (result === 'warning' && currentStatus !== 'failed') {
        map[key] = 'warning';
      } else if (result === 'success' && currentStatus === 'none') {
        map[key] = 'success';
      } else if (currentStatus === 'none') {
        // Other results, keep as none unless already set
      }
    });

    return map;
  }, [sessions]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday = 0, Sunday = 6 (ISO week)
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: Array<{ date: Date; inMonth: boolean; key: string }> = [];

    // Fill leading days from previous month
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({
        date: d,
        inMonth: false,
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      });
    }

    // Days of current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push({
        date,
        inMonth: true,
        key: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    // Fill trailing days to complete the grid (up to 42 = 6 weeks)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        days.push({
          date: d,
          inMonth: false,
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        });
      }
    }

    return days;
  }, [currentMonth]);

  const monthLabel = currentMonth.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-[22px] w-[22px] items-center justify-center rounded-md"
            style={{ background: 'rgba(76,175,80,0.12)' }}
          >
            <SourceLogo source="veeam" size={14} />
          </span>
          <h3 className="text-foreground text-[13px] font-semibold capitalize">Sauvegardes &mdash; {monthLabel}</h3>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goToNextMonth}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {loading && !sessions ? (
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-1">
              {Array.from({ length: 7 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-4 rounded-sm" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div>
          {/* Weekday headers */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-muted-foreground text-center text-sm">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, inMonth, key }) => {
              const status: DayStatus = dayStatusMap[key] || 'none';
              const color = getDayColor(status);
              const label = getDayLabel(status);
              const dayNum = date.getDate();
              const formattedDate = date.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              });

              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'flex aspect-square cursor-default items-center justify-center rounded-sm text-[9px] transition-colors',
                        !inMonth && 'opacity-20',
                      )}
                      style={{ backgroundColor: color }}
                    >
                      <span
                        className={cn('font-medium', status === 'none' ? 'text-muted-foreground/50' : 'text-white/90')}
                      >
                        {dayNum}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="capitalize">{formattedDate}</p>
                    <p className="text-sm">{label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4">
            {(['success', 'warning', 'failed', 'none'] as DayStatus[]).map((status) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: getDayColor(status) }} />
                <span className="text-muted-foreground text-sm">{getDayLabel(status)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
