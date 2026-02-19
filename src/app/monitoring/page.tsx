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

      {/* Alerts + Device tree — side by side on ultrawide */}
      <div className="space-y-6 2xl:grid 2xl:grid-cols-[3fr_2fr] 2xl:gap-6 2xl:space-y-0">
        <AlertList key={`alerts-${refreshKey}`} />
        <DeviceTree refreshSignal={refreshKey} />
      </div>
    </div>
  );
}
