'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  onRefresh: () => void;
  nextRefreshIn?: number; // seconds
  loading?: boolean;
  className?: string;
}

export function RefreshButton({
  onRefresh,
  nextRefreshIn,
  loading = false,
  className,
}: RefreshButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onRefresh}
      disabled={loading}
      className={cn('gap-2', className)}
    >
      <RefreshCw
        className={cn(
          'h-3.5 w-3.5',
          loading && 'animate-spin'
        )}
      />
      {nextRefreshIn !== undefined && nextRefreshIn > 0 && !loading && (
        <span className="text-sm text-muted-foreground">{nextRefreshIn}s</span>
      )}
      {loading && (
        <span className="text-sm text-muted-foreground">...</span>
      )}
    </Button>
  );
}
