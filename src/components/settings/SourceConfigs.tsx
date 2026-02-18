'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Server,
  X,
  Database,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SourceConfigForm } from '@/components/settings/SourceConfigForm';
import { cn } from '@/lib/utils';
import type { SourceName } from '@/types/common';

interface SourceDef {
  key: SourceName;
  label: string;
  color: string;
}

const sources: SourceDef[] = [
  { key: 'prtg', label: 'PRTG', color: '#2196F3' },
  { key: 'vcenter', label: 'VMware', color: '#4CAF50' },
  { key: 'proxmox', label: 'Proxmox', color: '#E87D0D' },
  { key: 'veeam', label: 'Veeam', color: '#00B336' },
  { key: 'glpi', label: 'GLPI', color: '#FEC72D' },
  { key: 'securetransport', label: 'SecureTransport', color: '#FF6D00' },
];

interface InstanceConfig {
  id: string;
  name: string;
  [key: string]: string;
}

type AllConfigs = Record<string, InstanceConfig[] | Record<string, string> | null>;

function getInstances(configs: AllConfigs, sourceKey: string): InstanceConfig[] {
  const val = configs[sourceKey];
  if (!val) return [];
  if (Array.isArray(val)) return val;
  const obj = val as Record<string, string>;
  if (obj.baseUrl) {
    return [{ id: 'default', name: obj.name || sourceKey, ...obj }];
  }
  return [];
}

export function SourceConfigs() {
  const [configs, setConfigs] = useState<AllConfigs>({});
  const [loading, setLoading] = useState(true);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [expandedInstances, setExpandedInstances] = useState<Record<string, boolean>>({});
  const [addingNew, setAddingNew] = useState<Record<string, boolean>>({});

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/sources');
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.config || data);
      }
    } catch (err) {
      console.error('[SourceConfigs] Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const toggleExpanded = useCallback((sourceKey: string) => {
    setExpandedSources((prev) => ({ ...prev, [sourceKey]: !prev[sourceKey] }));
  }, []);

  const toggleInstance = useCallback((instanceKey: string) => {
    setExpandedInstances((prev) => ({ ...prev, [instanceKey]: !prev[instanceKey] }));
  }, []);

  const handleSave = useCallback(async () => {
    await fetchConfigs();
  }, [fetchConfigs]);

  const startAddingInstance = useCallback((sourceKey: string) => {
    setAddingNew((prev) => ({ ...prev, [sourceKey]: true }));
    setExpandedSources((prev) => ({ ...prev, [sourceKey]: true }));
  }, []);

  const cancelAddingInstance = useCallback((sourceKey: string) => {
    setAddingNew((prev) => ({ ...prev, [sourceKey]: false }));
  }, []);

  const totalInstances = sources.reduce((acc, s) => {
    return acc + getInstances(configs, s.key).length;
  }, 0);

  return (
    <div className="settings-card-glow rounded-xl bg-background border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 border border-primary/20">
            <Database className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wide">Sources de donnees</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Connexions vers vos outils d&apos;infrastructure
            </p>
          </div>
        </div>
        {!loading && totalInstances > 0 && (
          <Badge className="bg-primary/10 text-primary border-primary/20 text-sm h-6 px-2.5 font-semibold">
            {totalInstances} instance{totalInstances > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Source List */}
      <div className="p-3 space-y-2 stagger-in">
        {loading ? (
          <>
            {sources.map(({ key }) => (
              <div
                key={key}
                className="h-14 rounded-lg bg-white/[0.02] animate-pulse border border-white/[0.03]"
              />
            ))}
          </>
        ) : (
          sources.map(({ key, label, color }) => {
            const instances = getInstances(configs, key);
            const instanceCount = instances.length;
            const expanded = expandedSources[key] || false;
            const isAddingNew = addingNew[key] || false;
            const isConfigured = instanceCount > 0;

            return (
              <div
                key={key}
                className={cn(
                  'relative rounded-lg border transition-all duration-300 overflow-hidden',
                  expanded
                    ? 'border-white/[0.08] bg-white/[0.015]'
                    : 'border-white/[0.04] hover:border-white/[0.08]',
                )}
              >
                {/* Colored top line */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(90deg, ${color}, ${color}60, transparent)`,
                    opacity: expanded ? 0.7 : isConfigured ? 0.4 : 0.1,
                  }}
                />

                {/* Source header */}
                <div className="flex items-center h-14">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(key)}
                    className="flex flex-1 items-center gap-3 pl-4 pr-2 h-full text-left transition-colors hover:bg-white/[0.015]"
                  >
                    <div className="flex items-center justify-center h-7 w-7 rounded-md shrink-0" style={{ backgroundColor: `${color}15` }}>
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5" style={{ color }} />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" style={{ color }} />
                      )}
                    </div>
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: isConfigured ? color : '#3f3f46',
                        boxShadow: isConfigured ? `0 0 8px ${color}40` : 'none',
                      }}
                    />
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                  </button>

                  <div className="flex items-center gap-2 pr-3">
                    {isConfigured ? (
                      <Badge
                        className="border-transparent text-sm h-5 px-2 font-semibold"
                        style={{
                          backgroundColor: `${color}15`,
                          color: color,
                        }}
                      >
                        {instanceCount}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground/30 mr-1">--</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startAddingInstance(key)}
                      className="h-7 w-7 p-0 text-muted-foreground/40 hover:text-foreground rounded-md"
                      title="Ajouter une instance"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded content */}
                {expanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-white/[0.04] space-y-2">
                    {instances.length === 0 && !isAddingNew && (
                      <button
                        type="button"
                        onClick={() => startAddingInstance(key)}
                        className="flex items-center justify-center gap-2.5 w-full py-6 rounded-lg border border-dashed border-white/[0.08] text-muted-foreground/40 hover:text-muted-foreground hover:border-white/[0.15] transition-all"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm">Ajouter une instance {label}</span>
                      </button>
                    )}

                    {/* Existing instances */}
                    {instances.map((instance) => {
                      const iKey = `${key}-${instance.id}`;
                      const isExpanded = expandedInstances[iKey] || false;

                      const configFields: Record<string, string> = {};
                      Object.entries(instance).forEach(([k, v]) => {
                        if (k !== 'id' && k !== 'name') {
                          configFields[k] = v;
                        }
                      });

                      return (
                        <div
                          key={instance.id}
                          className={cn(
                            'rounded-lg border transition-all duration-200 overflow-hidden',
                            isExpanded
                              ? 'border-white/[0.08] bg-background'
                              : 'border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08]',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleInstance(iKey)}
                            className="flex w-full items-center justify-between px-3.5 py-3 text-left hover:bg-white/[0.015] transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                              )}
                              <Server className="h-3.5 w-3.5 shrink-0" style={{ color: `${color}80` }} />
                              <span className="text-sm font-medium text-foreground truncate">
                                {instance.name}
                              </span>
                            </div>
                            {instance.baseUrl && (
                              <span className="text-sm text-muted-foreground/40 truncate max-w-[200px] ml-3 font-mono">
                                {instance.baseUrl.replace(/^https?:\/\//, '')}
                              </span>
                            )}
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-2 border-t border-white/[0.04]">
                              <SourceConfigForm
                                source={key}
                                config={configFields}
                                instanceId={instance.id}
                                instanceName={instance.name}
                                onSave={handleSave}
                                onDelete={() => {
                                  setExpandedInstances((prev) => {
                                    const next = { ...prev };
                                    delete next[iKey];
                                    return next;
                                  });
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* New instance form */}
                    {isAddingNew && (
                      <div
                        className="rounded-lg border border-dashed p-4 overflow-hidden"
                        style={{ borderColor: `${color}30`, backgroundColor: `${color}06` }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="h-5 w-5 rounded-md flex items-center justify-center"
                              style={{ backgroundColor: `${color}15` }}
                            >
                              <Plus className="h-3 w-3" style={{ color }} />
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                              Nouvelle instance {label}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelAddingInstance(key)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <SourceConfigForm
                          source={key}
                          config={null}
                          isNew
                          onSave={async () => {
                            await handleSave();
                            cancelAddingInstance(key);
                          }}
                        />
                      </div>
                    )}

                    {/* Add more */}
                    {instances.length > 0 && !isAddingNew && (
                      <button
                        type="button"
                        onClick={() => startAddingInstance(key)}
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-muted-foreground/30 hover:text-muted-foreground/60 transition-all text-sm hover:bg-white/[0.02]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter une instance
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
