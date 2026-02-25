'use client';

import { ChevronDown, ChevronRight, Plus, Server, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SourceConfigForm } from '@/components/settings/SourceConfigForm';
import { cn } from '@/lib/utils';
import { SourceLogo } from '@/components/ui/SourceLogo';
import type { SourceName } from '@/types/common';

export interface SourceDef {
  key: SourceName;
  label: string;
  color: string;
}

export interface InstanceConfig {
  id: string;
  name: string;
  [key: string]: string;
}

interface SourceItemProps {
  source: SourceDef;
  instances: InstanceConfig[];
  expanded: boolean;
  onToggleExpanded: () => void;
  expandedInstances: Record<string, boolean>;
  onToggleInstance: (key: string) => void;
  isAddingNew: boolean;
  onStartAddingInstance: () => void;
  onCancelAddingInstance: () => void;
  onSave: () => Promise<void>;
}

export function SourceItem({
  source,
  instances,
  expanded,
  onToggleExpanded,
  expandedInstances,
  onToggleInstance,
  isAddingNew,
  onStartAddingInstance,
  onCancelAddingInstance,
  onSave,
}: SourceItemProps) {
  const { key, label } = source;
  const instanceCount = instances.length;
  const isConfigured = instanceCount > 0;

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        expanded ? 'border-border bg-card' : 'border-border hover:bg-accent/50',
      )}
    >
      {/* Source header */}
      <div className="flex h-12 items-center">
        <button
          type="button"
          onClick={onToggleExpanded}
          className="hover:bg-accent/50 flex h-full flex-1 items-center gap-3 pr-2 pl-4 text-left transition-colors"
        >
          {expanded ? (
            <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
          )}
          <SourceLogo source={key} size={18} colored={isConfigured} />
          <span className="text-foreground text-sm font-medium">{label}</span>
        </button>

        <div className="flex items-center gap-2 pr-3">
          {isConfigured ? (
            <Badge variant="secondary" className="h-5 px-2 text-xs font-medium">
              {instanceCount}
            </Badge>
          ) : (
            <span className="text-muted-foreground/30 mr-1 text-xs">--</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onStartAddingInstance}
            className="text-muted-foreground/40 hover:text-foreground h-7 w-7 rounded-md p-0"
            title="Ajouter une instance"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-border space-y-2 border-t px-3 pt-1 pb-3">
          {instances.length === 0 && !isAddingNew && (
            <button
              type="button"
              onClick={onStartAddingInstance}
              className="border-border text-muted-foreground/40 hover:text-muted-foreground hover:border-border flex w-full items-center justify-center gap-2.5 rounded-lg border border-dashed py-6 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">Ajouter une instance {label}</span>
            </button>
          )}

          {/* Existing instances */}
          {instances.map((instance) => {
            const iKey = `${key}-${instance.id}`;
            const isExpanded = expandedInstances[iKey] || false;
            const singleInstance = instances.length === 1;

            const configFields: Record<string, string> = {};
            Object.entries(instance).forEach(([k, v]) => {
              if (k !== 'id' && k !== 'name') {
                configFields[k] = v;
              }
            });

            // Single instance: show form directly, no sub-accordion
            if (singleInstance) {
              return (
                <div key={instance.id} className="border-border bg-card rounded-lg border">
                  <div className="px-4 py-4">
                    <SourceConfigForm
                      source={key}
                      config={configFields}
                      instanceId={instance.id}
                      instanceName={instance.name}
                      onSave={onSave}
                      onDelete={() => {
                        onToggleInstance(iKey);
                      }}
                    />
                  </div>
                </div>
              );
            }

            // Multiple instances: keep sub-accordion
            return (
              <div
                key={instance.id}
                className={cn(
                  'overflow-hidden rounded-lg border transition-colors',
                  isExpanded ? 'border-border bg-background' : 'border-border bg-card hover:bg-accent/50',
                )}
              >
                <button
                  type="button"
                  onClick={() => onToggleInstance(iKey)}
                  className="hover:bg-accent/50 flex w-full items-center justify-between px-3.5 py-3 text-left transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {isExpanded ? (
                      <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    )}
                    <Server className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    <span className="text-foreground truncate text-sm font-medium">{instance.name}</span>
                  </div>
                  {instance.baseUrl && (
                    <span className="text-muted-foreground/40 ml-3 max-w-[200px] truncate font-mono text-xs">
                      {instance.baseUrl.replace(/^https?:\/\//, '')}
                    </span>
                  )}
                </button>

                {isExpanded && (
                  <div className="border-border border-t px-4 pt-2 pb-4">
                    <SourceConfigForm
                      source={key}
                      config={configFields}
                      instanceId={instance.id}
                      instanceName={instance.name}
                      onSave={onSave}
                      onDelete={() => {
                        onToggleInstance(iKey);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* New instance form */}
          {isAddingNew && (
            <div className="border-border overflow-hidden rounded-lg border border-dashed p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Plus className="text-muted-foreground h-4 w-4" />
                  <span className="text-foreground text-sm font-medium">Nouvelle instance {label}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancelAddingInstance}
                  className="text-muted-foreground hover:text-foreground h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <SourceConfigForm
                source={key}
                config={null}
                isNew
                onSave={async (newInstanceId?: string) => {
                  await onSave();
                  onCancelAddingInstance();
                  if (newInstanceId) {
                    onToggleInstance(`${key}-${newInstanceId}`);
                  }
                }}
              />
            </div>
          )}

          {/* Add more */}
          {instances.length > 0 && !isAddingNew && (
            <button
              type="button"
              onClick={onStartAddingInstance}
              className="text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-accent/50 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter une instance
            </button>
          )}
        </div>
      )}
    </div>
  );
}
