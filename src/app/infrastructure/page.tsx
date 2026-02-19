'use client';

import { HypervisorTabs } from '@/components/infrastructure/HypervisorTabs';
import { PageHeader } from '@/components/layout/PageHeader';

export default function InfrastructurePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Infrastructure" />

      <HypervisorTabs />
    </div>
  );
}
