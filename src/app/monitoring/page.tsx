'use client';

import { SensorGrid } from '@/components/monitoring/SensorGrid';
import { AlertList } from '@/components/monitoring/AlertList';
import { DeviceTree } from '@/components/monitoring/DeviceTree';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePageRefresh } from '@/hooks/usePageRefresh';

export default function MonitoringPage() {
  const { refreshKey, loading, handleRefresh } = usePageRefresh();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring PRTG"
        source="prtg"
        actions={<RefreshButton onRefresh={handleRefresh} loading={loading} />}
      />

      {/* Sensor counters */}
      <SensorGrid key={`sensors-${refreshKey}`} />

      {/* Alerts */}
      <AlertList key={`alerts-${refreshKey}`} />

      {/* Device tree (has expand state → refreshSignal) */}
      <DeviceTree refreshSignal={refreshKey} />
    </div>
  );
}
