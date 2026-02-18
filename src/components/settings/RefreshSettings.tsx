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
  { key: 'prtg',      label: 'PRTG',            color: '#2196F3' },
  { key: 'infra',     label: 'Infrastructure',   color: '#4CAF50' },
  { key: 'veeam',     label: 'Veeam',            color: '#00B336' },
  { key: 'tickets',   label: 'GLPI',             color: '#FEC72D' },
  { key: 'transfers', label: 'SecureTransport',  color: '#FF6D00' },
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

export function RefreshSettings() {
  const { intervals, updateIntervals } = useRefreshIntervals();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<RefreshKey, number>>(() => toDraftSeconds(intervals));

  function toDraftSeconds(ms: RefreshIntervals): Record<RefreshKey, number> {
    return {
      prtg: Math.round(ms.prtg / 1000),
      infra: Math.round(ms.infra / 1000),
      veeam: Math.round(ms.veeam / 1000),
      tickets: Math.round(ms.tickets / 1000),
      transfers: Math.round(ms.transfers / 1000),
    };
  }

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
    setDraft(prev => ({ ...prev, [key]: value }));
  }

  const seconds = refreshConfigs.map(c => Math.round(intervals[c.key] / 1000));
  const maxInterval = Math.max(...seconds);

  const isValid = refreshConfigs.every(({ key }) => draft[key] >= MIN_SECONDS);

  return (
    <div className="settings-card-glow rounded-xl bg-background border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 border border-primary/20">
            <Timer className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wide">Intervalles de refresh</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Frequence de mise a jour des donnees
            </p>
          </div>
        </div>

        {!editing ? (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Modifier
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <X className="h-3 w-3" />
              Annuler
            </button>
            <button
              onClick={saveEdit}
              disabled={saving || !isValid}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Enregistrer
            </button>
          </div>
        )}
      </div>

      {/* Bars */}
      <div className="px-5 py-4 space-y-3 stagger-in">
        {refreshConfigs.map((config, i) => {
          const sec = seconds[i];
          const barWidth = maxInterval > 0 ? (sec / maxInterval) * 100 : 0;

          return (
            <div key={config.key} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-sm font-medium text-foreground">{config.label}</span>
                </div>

                {editing ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={MIN_SECONDS}
                      value={draft[config.key]}
                      onChange={e => setDraftValue(config.key, parseInt(e.target.value) || MIN_SECONDS)}
                      className="w-16 h-6 px-1.5 text-xs font-mono text-right bg-muted/20 border border-border/50 rounded focus:outline-none focus:ring-1 focus:ring-ring tabular-nums"
                    />
                    <span className="text-xs text-muted-foreground">s</span>
                  </div>
                ) : (
                  <span className="text-sm font-mono font-semibold text-muted-foreground tabular-nums">
                    {formatInterval(sec)}
                  </span>
                )}
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${barWidth}%`,
                    background: `linear-gradient(90deg, ${config.color}60, ${config.color})`,
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
