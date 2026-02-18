'use client';

import { useState, useCallback } from 'react';

export function usePageRefresh(delay = 1000) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setLoading(false), delay);
  }, [delay]);

  return { refreshKey, loading, handleRefresh };
}
