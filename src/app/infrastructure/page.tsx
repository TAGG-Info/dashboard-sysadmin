'use client';

import { useState, useCallback } from 'react';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { HypervisorTabs } from '@/components/infrastructure/HypervisorTabs';

export default function InfrastructurePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Infrastructure</h1>
        <RefreshButton onRefresh={handleRefresh} loading={loading} />
      </div>

      <HypervisorTabs key={`infra-${refreshKey}`} />
    </div>
  );
}
