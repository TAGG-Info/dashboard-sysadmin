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

const sources: { key: SourceName; label: string; color: string }[] = [
  { key: 'prtg', label: 'PRTG', color: '#f99e1c' },
  { key: 'vcenter', label: 'VMware', color: '#879AC3' },
  { key: 'proxmox', label: 'Proxmox', color: '#E57000' },
  { key: 'veeam', label: 'Veeam', color: '#4caf50' },
  { key: 'glpi', label: 'GLPI', color: '#00a5f3' },
  { key: 'securetransport', label: 'ST', color: '#D9272D' },
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
    <div className="settings-card-glow rounded-xl bg-background border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wide">Health Checks</h3>
            {hasResults && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {Object.values(results).filter((r) => r.status === 'connected').length}/{sources.length} connectes
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={runAllChecks}
          disabled={testing}
          className="gap-2 h-8 text-sm border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
        >
          {testing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCw className="h-3.5 w-3.5" />
          )}
          Tout tester
        </Button>
      </div>

      {/* Status Tile Grid */}
      <div className="grid grid-cols-3 gap-[1px] bg-white/[0.03] stagger-in">
        {sources.map(({ key, label, color }) => {
          const result = results[key];
          const isTestingThis = testingSource === key || (testing && !result);
          const isConnected = result?.status === 'connected';
          const isError = result?.status === 'error';

          return (
            <button
              key={key}
              type="button"
              onClick={() => testSingle(key)}
              disabled={testing || testingSource !== null}
              className={cn(
                'relative flex flex-col items-center justify-center py-5 px-3 bg-background transition-all duration-300',
                'hover:bg-white/[0.02] disabled:pointer-events-none',
                'group cursor-pointer',
              )}
            >
              {/* Colored top accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-300"
                style={{
                  background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                  opacity: result ? (isConnected ? 0.8 : 0.3) : 0.15,
                }}
              />

              {/* Source label */}
              <div className="flex items-center gap-1.5 mb-3">
                <SourceLogo source={key} size={16} />
                <span className="text-sm font-medium tracking-wider uppercase text-muted-foreground">
                  {label}
                </span>
              </div>

              {/* Status indicator */}
              {isTestingThis ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-2" />
              ) : (
                <div
                  className="h-3.5 w-3.5 rounded-full mb-2 transition-all duration-500"
                  style={{
                    backgroundColor: result
                      ? isConnected ? color : '#ef4444'
                      : `${color}40`,
                  }}
                />
              )}

              {/* Result info */}
              {result && !isTestingThis ? (
                isConnected ? (
                  <span className="text-sm font-mono font-semibold text-emerald-400">
                    {result.latency}ms
                  </span>
                ) : (
                  <span className="text-sm font-medium text-red-400 truncate max-w-full">
                    {result.error || 'Erreur'}
                  </span>
                )
              ) : !isTestingThis ? (
                <span className="text-sm text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors">
                  tester
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
