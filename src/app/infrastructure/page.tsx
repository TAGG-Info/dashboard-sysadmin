'use client';

import { RefreshButton } from '@/components/ui/RefreshButton';
import { HypervisorTabs } from '@/components/infrastructure/HypervisorTabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePageRefresh } from '@/hooks/usePageRefresh';

export default function InfrastructurePage() {
  const { refreshKey, loading, handleRefresh } = usePageRefresh();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Infrastructure"
        actions={<RefreshButton onRefresh={handleRefresh} loading={loading} />}
      />

      <HypervisorTabs key={`infra-${refreshKey}`} />
    </div>
  );
}
