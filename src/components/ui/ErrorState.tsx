import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title: string;
  message?: string;
  source?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title, message, source, onRetry, className }: ErrorStateProps) {
  return (
    <Card className={cn('border-destructive/30 border', className)}>
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
        <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
          <AlertTriangle className="text-destructive h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-foreground text-sm font-semibold">{title}</h3>
          {message && <p className="text-muted-foreground text-sm">{message}</p>}
          {source && (
            <p className="text-muted-foreground text-sm">
              Source : <span className="font-medium">{source}</span>
            </p>
          )}
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Reessayer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
