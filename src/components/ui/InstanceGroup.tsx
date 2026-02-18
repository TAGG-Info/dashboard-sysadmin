'use client';

import { useMemo, type ReactNode } from 'react';
import { Building2 } from 'lucide-react';
import type { InstanceMetadata } from '@/types/common';

/** Group items by _instanceId, preserving order of first appearance */
export function groupByInstance<T extends Partial<InstanceMetadata>>(
  items: T[]
): { instanceId: string; instanceName: string; items: T[] }[] {
  const map = new Map<string, { instanceName: string; items: T[] }>();

  for (const item of items) {
    const id = item._instanceId ?? 'default';
    const name = item._instanceName ?? '';
    if (!map.has(id)) {
      map.set(id, { instanceName: name, items: [] });
    }
    map.get(id)!.items.push(item);
  }

  return Array.from(map.entries()).map(([instanceId, { instanceName, items }]) => ({
    instanceId,
    instanceName,
    items,
  }));
}

/** Returns true if items come from more than one instance */
export function hasMultipleInstances<T extends Partial<InstanceMetadata>>(items: T[]): boolean {
  if (!items || items.length === 0) return false;
  const ids = new Set(items.map((item) => item._instanceId ?? 'default'));
  return ids.size > 1;
}

interface InstanceSectionHeaderProps {
  instanceName: string;
  className?: string;
}

/** A subtle section header showing the instance name with a colored dot and line */
export function InstanceSectionHeader({ instanceName, className }: InstanceSectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2 py-2 ${className ?? ''}`}>
      <div className="flex items-center gap-1.5 shrink-0">
        <Building2 className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          {instanceName}
        </span>
      </div>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

interface InstanceGroupRendererProps<T extends Partial<InstanceMetadata>> {
  items: T[];
  renderItems: (items: T[], instanceId: string, instanceName: string) => ReactNode;
  className?: string;
}

/**
 * Renders items grouped by instance. If there is only one instance,
 * no section headers are shown (clean UX).
 */
export function InstanceGroupRenderer<T extends Partial<InstanceMetadata>>({
  items,
  renderItems,
  className,
}: InstanceGroupRendererProps<T>) {
  const groups = useMemo(() => groupByInstance(items), [items]);
  const showHeaders = groups.length > 1;

  return (
    <div className={className}>
      {groups.map((group) => (
        <div key={group.instanceId}>
          {showHeaders && (
            <InstanceSectionHeader instanceName={group.instanceName} />
          )}
          {renderItems(group.items, group.instanceId, group.instanceName)}
        </div>
      ))}
    </div>
  );
}
