'use client';

import { SensorGrid } from '@/components/monitoring/SensorGrid';
import { AlertList } from '@/components/monitoring/AlertList';
import { DeviceTree } from '@/components/monitoring/DeviceTree';
import { PageHeader } from '@/components/layout/PageHeader';

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Monitoring PRTG" source="prtg" />

      {/* Sensor counters */}
      <SensorGrid />

      {/* Alerts + Device tree — side by side on ultrawide */}
      <div className="space-y-6 2xl:grid 2xl:grid-cols-[3fr_2fr] 2xl:gap-6 2xl:space-y-0">
        <AlertList />
        <DeviceTree />
      </div>
    </div>
  );
}
