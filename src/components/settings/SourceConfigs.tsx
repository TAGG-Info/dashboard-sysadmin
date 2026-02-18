'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SourceItem } from '@/components/settings/SourceItem';
import type { SourceDef, InstanceConfig } from '@/components/settings/SourceItem';

const sources: SourceDef[] = [
  { key: 'prtg', label: 'PRTG', color: '#2196F3' },
  { key: 'vcenter', label: 'VMware', color: '#4CAF50' },
  { key: 'proxmox', label: 'Proxmox', color: '#E87D0D' },
  { key: 'veeam', label: 'Veeam', color: '#00B336' },
  { key: 'glpi', label: 'GLPI', color: '#FEC72D' },
  { key: 'securetransport', label: 'SecureTransport', color: '#FF6D00' },
];

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
          sources.map((source) => (
            <SourceItem
              key={source.key}
              source={source}
              instances={getInstances(configs, source.key)}
              expanded={expandedSources[source.key] || false}
              onToggleExpanded={() => toggleExpanded(source.key)}
              expandedInstances={expandedInstances}
              onToggleInstance={toggleInstance}
              isAddingNew={addingNew[source.key] || false}
              onStartAddingInstance={() => startAddingInstance(source.key)}
              onCancelAddingInstance={() => cancelAddingInstance(source.key)}
              onSave={handleSave}
            />
          ))
        )}
      </div>
    </div>
  );
}
