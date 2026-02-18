import { useEffect, useRef } from 'react';

/**
 * Hook to handle refreshSignal pattern — triggers refresh() when refreshSignal changes,
 * without re-creating the effect on every refresh identity change.
 */
export function useRefreshSignal(
  refreshSignal: number | undefined,
  refresh: (() => Promise<void>) | undefined,
) {
  const refreshRef = useRef<(() => Promise<void>) | undefined>(undefined);
  useEffect(() => {
    refreshRef.current = refresh;
  });
  useEffect(() => {
    if (refreshSignal) refreshRef.current?.();
  }, [refreshSignal]);
}
