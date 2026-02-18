'use client';

import {
  ChevronDown,
  ChevronRight,
  Plus,
  Server,
  X,
} from 'lucide-react';
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
  const { key, label, color } = source;
  const instanceCount = instances.length;
  const isConfigured = instanceCount > 0;

  return (
    <div
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
          onClick={onToggleExpanded}
          className="flex flex-1 items-center gap-3 pl-4 pr-2 h-full text-left transition-colors hover:bg-white/[0.015]"
        >
          <div className="flex items-center justify-center h-7 w-7 rounded-md shrink-0" style={{ backgroundColor: `${color}15` }}>
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" style={{ color }} />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" style={{ color }} />
            )}
          </div>
          <SourceLogo source={key} size={18} colored={isConfigured} />
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
            onClick={onStartAddingInstance}
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
              onClick={onStartAddingInstance}
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
                  onClick={() => onToggleInstance(iKey)}
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
                  onClick={onCancelAddingInstance}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
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
}
