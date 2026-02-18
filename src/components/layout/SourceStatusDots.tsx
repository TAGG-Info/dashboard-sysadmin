'use client';

import { useState, useEffect, useCallback } from 'react';
import { SourceIndicator } from '@/components/ui/SourceIndicator';

type SourceName = 'prtg' | 'vcenter' | 'proxmox' | 'veeam' | 'glpi' | 'securetransport';

interface SourceHealth {
  source: string;
  status: 'connected' | 'error';
  latency: number;
  error?: string;
}

const sourceKeys: SourceName[] = ['prtg', 'vcenter', 'proxmox', 'veeam', 'glpi', 'securetransport'];

// Check health every 2 minutes
const HEALTH_CHECK_INTERVAL = 120000;

export function SourceStatusDots() {
  const [statuses, setStatuses] = useState<Record<string, boolean | undefined>>({});

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) return;
      const data: { sources: SourceHealth[] } = await res.json();
      const map: Record<string, boolean> = {};
      data.sources.forEach((s) => {
        map[s.source] = s.status === 'connected';
      });
      setStatuses(map);
    } catch {
      // Silently fail - keep previous statuses
    }
  }, []);

  useEffect(() => {
    // Initial check after a short delay (don't block initial render)
    const timeout = setTimeout(checkHealth, 3000);

    // Periodic checks
    const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [checkHealth]);

  return (
    <div className="hidden lg:flex items-center gap-2">
      {sourceKeys.map((source) => (
        <SourceIndicator
          key={source}
          source={source}
          connected={statuses[source]}
        />
      ))}
    </div>
  );
}
