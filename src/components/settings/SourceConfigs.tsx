'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database } from 'lucide-react';
import { toast } from 'sonner';
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
    } catch (_err) {
      toast.error('Erreur de chargement de la configuration');
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
    <div className="settings-card-glow bg-background overflow-hidden rounded-xl border border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 border-primary/20 flex h-8 w-8 items-center justify-center rounded-lg border">
            <Database className="text-primary h-4 w-4" />
          </div>
          <div>
            <h3 className="text-foreground text-sm font-semibold tracking-wide">Sources de donnees</h3>
            <p className="text-muted-foreground mt-0.5 text-sm">Connexions vers vos outils d&apos;infrastructure</p>
          </div>
        </div>
        {!loading && totalInstances > 0 && (
          <Badge className="bg-primary/10 text-primary border-primary/20 h-6 px-2.5 text-sm font-semibold">
            {totalInstances} instance{totalInstances > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Source List */}
      <div className="stagger-in space-y-2 p-3">
        {loading ? (
          <>
            {sources.map(({ key }) => (
              <div key={key} className="h-14 animate-pulse rounded-lg border border-white/[0.03] bg-white/[0.02]" />
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
