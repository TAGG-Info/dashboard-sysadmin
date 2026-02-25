'use client';

import { useState, useCallback } from 'react';
import { Loader2, Activity, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SourceLogo } from '@/components/ui/SourceLogo';

import type { SourceName } from '@/types/common';

interface SourceHealth {
  source: string;
  status: 'connected' | 'error';
  latency: number;
  error?: string;
}

interface HealthResult {
  sources: SourceHealth[];
  timestamp: number;
}

const sources: { key: SourceName; label: string }[] = [
  { key: 'prtg', label: 'PRTG' },
  { key: 'vcenter', label: 'VMware' },
  { key: 'proxmox', label: 'Proxmox' },
  { key: 'veeam', label: 'Veeam' },
  { key: 'glpi', label: 'GLPI' },
  { key: 'securetransport', label: 'ST' },
];

export function HealthChecks() {
  const [results, setResults] = useState<Record<string, SourceHealth>>({});
  const [testing, setTesting] = useState(false);
  const [testingSource, setTestingSource] = useState<string | null>(null);

  const runAllChecks = useCallback(async () => {
    setTesting(true);
    setResults({});
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HealthResult = await res.json();
      const map: Record<string, SourceHealth> = {};
      data.sources.forEach((s) => {
        map[s.source] = s;
      });
      setResults(map);
    } catch {
      const map: Record<string, SourceHealth> = {};
      sources.forEach((s) => {
        map[s.key] = { source: s.key, status: 'error', latency: 0, error: 'Unreachable' };
      });
      setResults(map);
    } finally {
      setTesting(false);
      setTestingSource(null);
    }
  }, []);

  const testSingle = useCallback(async (sourceKey: string) => {
    setTestingSource(sourceKey);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HealthResult = await res.json();
      const found = data.sources.find((s) => s.source === sourceKey);
      if (found) {
        setResults((prev) => ({ ...prev, [sourceKey]: found }));
      }
    } catch {
      setResults((prev) => ({
        ...prev,
        [sourceKey]: { source: sourceKey, status: 'error', latency: 0, error: 'Unreachable' },
      }));
    } finally {
      setTestingSource(null);
    }
  }, []);

  const hasResults = Object.keys(results).length > 0;

  return (
    <div className="bg-card border-border/60 overflow-hidden rounded-lg border">
      {/* Header */}
      <div className="border-border/60 flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
            <Activity className="text-muted-foreground h-4 w-4" />
          </div>
          <div>
            <h3 className="text-foreground text-sm font-semibold">Health Checks</h3>
            {hasResults && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                {Object.values(results).filter((r) => r.status === 'connected').length}/{sources.length} connectes
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={runAllChecks} disabled={testing} className="h-8 gap-2 text-xs">
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
          Tout tester
        </Button>
      </div>

      {/* Status Tile Grid */}
      <div className="stagger-in bg-border grid grid-cols-3 gap-px">
        {sources.map(({ key, label }) => {
          const result = results[key];
          const isTestingThis = testingSource === key || (testing && !result);
          const isConnected = result?.status === 'connected';

          return (
            <button
              key={key}
              type="button"
              onClick={() => testSingle(key)}
              disabled={testing || testingSource !== null}
              className={cn(
                'bg-card flex flex-col items-center justify-center px-3 py-5 transition-colors',
                'hover:bg-accent disabled:pointer-events-none',
                'cursor-pointer',
              )}
            >
              {/* Source label */}
              <div className="mb-3 flex items-center gap-1.5">
                <SourceLogo source={key} size={16} />
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{label}</span>
              </div>

              {/* Status indicator */}
              {isTestingThis ? (
                <Loader2 className="text-muted-foreground mb-2 h-5 w-5 animate-spin" />
              ) : (
                <div
                  className={cn(
                    'mb-2 h-3 w-3 rounded-full transition-colors',
                    result ? (isConnected ? 'bg-emerald-500' : 'bg-red-500') : 'bg-muted-foreground/20',
                  )}
                />
              )}

              {/* Result info */}
              {result && !isTestingThis ? (
                isConnected ? (
                  <span className="font-mono text-xs font-medium text-emerald-400">{result.latency}ms</span>
                ) : (
                  <span className="max-w-full truncate text-xs font-medium text-red-400">
                    {result.error || 'Erreur'}
                  </span>
                )
              ) : !isTestingThis ? (
                <span className="text-muted-foreground/40 text-xs">tester</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
