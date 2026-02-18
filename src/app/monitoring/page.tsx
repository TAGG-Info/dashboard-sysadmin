'use client';

import { useState, useCallback } from 'react';
import { SensorGrid } from '@/components/monitoring/SensorGrid';
import { AlertList } from '@/components/monitoring/AlertList';
import { DeviceTree } from '@/components/monitoring/DeviceTree';
import { RefreshButton } from '@/components/ui/RefreshButton';

export default function MonitoringPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    // Force re-mount of child components to trigger fresh fetches
    setRefreshKey((prev) => prev + 1);
    // Brief delay to show loading state
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Monitoring PRTG</h1>
        <RefreshButton
          onRefresh={handleRefresh}
          loading={loading}
        />
      </div>

      {/* Sensor counters */}
      <SensorGrid key={`sensors-${refreshKey}`} />

      {/* Alerts */}
      <AlertList key={`alerts-${refreshKey}`} />

      {/* Device tree */}
      <DeviceTree key={`devices-${refreshKey}`} />
    </div>
  );
}
