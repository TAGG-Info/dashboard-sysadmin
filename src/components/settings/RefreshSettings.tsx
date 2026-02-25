'use client';

import { useState } from 'react';
import { Timer, Pencil, Save, X, Loader2 } from 'lucide-react';
import { useRefreshIntervals, type RefreshIntervals } from '@/components/providers/RefreshIntervalsProvider';

type RefreshKey = keyof RefreshIntervals;

interface RefreshConfig {
  key: RefreshKey;
  label: string;
  color: string;
}

const refreshConfigs: RefreshConfig[] = [
  { key: 'prtg', label: 'PRTG', color: '#2196F3' },
  { key: 'infra', label: 'Infrastructure', color: '#4CAF50' },
  { key: 'veeam', label: 'Veeam', color: '#00B336' },
  { key: 'tickets', label: 'GLPI', color: '#FEC72D' },
  { key: 'transfers', label: 'ST Transferts', color: '#FF6D00' },
  { key: 'transferLogs', label: 'ST Logs', color: '#FF9100' },
];

const MIN_SECONDS = 10;

function formatInterval(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes} min`;
  }
  return `${seconds}s`;
}

function toDraftSeconds(ms: RefreshIntervals): Record<RefreshKey, number> {
  return {
    prtg: Math.round(ms.prtg / 1000),
    infra: Math.round(ms.infra / 1000),
    veeam: Math.round(ms.veeam / 1000),
    tickets: Math.round(ms.tickets / 1000),
    transfers: Math.round(ms.transfers / 1000),
    transferLogs: Math.round(ms.transferLogs / 1000),
  };
}

export function RefreshSettings() {
  const { intervals, updateIntervals } = useRefreshIntervals();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<RefreshKey, number>>(() => toDraftSeconds(intervals));

  function startEdit() {
    setDraft(toDraftSeconds(intervals));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    setSaving(true);
    const ms: Partial<RefreshIntervals> = {};
    for (const { key } of refreshConfigs) {
      ms[key] = Math.max(MIN_SECONDS, draft[key]) * 1000;
    }
    const ok = await updateIntervals(ms);
    setSaving(false);
    if (ok) setEditing(false);
  }

  function setDraftValue(key: RefreshKey, value: number) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const seconds = refreshConfigs.map((c) => Math.round(intervals[c.key] / 1000));
  const maxInterval = Math.max(...seconds);

  const isValid = refreshConfigs.every(({ key }) => draft[key] >= MIN_SECONDS);

  return (
    <div className="bg-card border-border/60 overflow-hidden rounded-lg border">
      {/* Header */}
      <div className="border-border/60 flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
            <Timer className="text-muted-foreground h-4 w-4" />
          </div>
          <div>
            <h3 className="text-foreground text-sm font-semibold">Intervalles de refresh</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">Frequence de mise a jour des donnees</p>
          </div>
        </div>

        {!editing ? (
          <button
            onClick={startEdit}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Modifier
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors disabled:opacity-40"
            >
              <X className="h-3 w-3" />
              Annuler
            </button>
            <button
              onClick={saveEdit}
              disabled={saving || !isValid}
              className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Enregistrer
            </button>
          </div>
        )}
      </div>

      {/* Bars */}
      <div className="stagger-in space-y-3 px-5 py-4">
        {refreshConfigs.map((config, i) => {
          const sec = seconds[i];
          const barWidth = maxInterval > 0 ? (sec / maxInterval) * 100 : 0;

          return (
            <div key={config.key} className="group">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="bg-muted-foreground/30 h-2 w-2 rounded-full" />
                  <span className="text-foreground text-sm font-medium">{config.label}</span>
                </div>

                {editing ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={MIN_SECONDS}
                      value={draft[config.key]}
                      onChange={(e) => setDraftValue(config.key, parseInt(e.target.value) || MIN_SECONDS)}
                      className="bg-muted/20 border-border/60 focus:ring-ring h-6 w-16 rounded border px-1.5 text-right font-mono text-xs tabular-nums focus:ring-1 focus:outline-none"
                    />
                    <span className="text-muted-foreground text-xs">s</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground font-mono text-sm font-semibold tabular-nums">
                    {formatInterval(sec)}
                  </span>
                )}
              </div>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: 'var(--color-muted-foreground)',
                    opacity: 0.5,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
