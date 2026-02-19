'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutoRefreshOptions {
  url: string;
  interval: number; // ms
  enabled?: boolean;
  /**
   * Set to true only when the consumer displays `nextRefreshIn`.
   * When false (default), the countdown interval is skipped — eliminates ~1 re-render/5s per hook instance.
   */
  trackCountdown?: boolean;
  /**
   * Set to false to do the initial fetch but skip the periodic auto-refresh interval.
   * Useful for on-demand data (e.g. per-device sensors) that shouldn't poll independently.
   */
  autoRefresh?: boolean;
}

export interface UseAutoRefreshReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  nextRefreshIn: number; // seconds — only updates when trackCountdown: true
  isStale: boolean;
}

const MAX_RETRIES = 2;
const BACKOFF_BASE = 2000; // 2s, 4s

export function useAutoRefresh<T>(options: UseAutoRefreshOptions): UseAutoRefreshReturn<T> {
  const { url, interval, enabled = true, trackCountdown = false, autoRefresh = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(Math.floor(interval / 1000));
  const [isStale, setIsStale] = useState(false);
  // Incremented on manual refresh to restart the interval timer (#22)
  const [refreshEpoch, setRefreshEpoch] = useState(0);

  const retryCountRef = useRef(0);
  const consecutiveFailsRef = useRef(0);
  const scheduledCountRef = useRef(0);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const lastManualRefreshRef = useRef(0);

  const fetchData = useCallback(
    async (isScheduled = false, bypassCache = false) => {
      if (fetchingRef.current) return;

      // Skip scheduled fetch if a manual refresh happened recently
      if (isScheduled && Date.now() - lastManualRefreshRef.current < interval * 0.5) {
        return;
      }

      // After repeated failures, slow down: skip scheduled fetches
      // and only retry at longer intervals (2x, 4x, max 8x the normal interval)
      if (isScheduled && consecutiveFailsRef.current >= 1) {
        const skipFactor = Math.min(consecutiveFailsRef.current, 3);
        scheduledCountRef.current += 1;
        if (scheduledCountRef.current % Math.pow(2, skipFactor) !== 0) {
          return;
        }
      }

      fetchingRef.current = true;
      // Skip loading indicator for scheduled refreshes — data stays visible, avoids double repaint
      if (!isScheduled) setLoading(true);

      try {
        const response = await fetch(url, {
          cache: 'no-store',
          ...(bypassCache && { headers: { 'X-No-Cache': '1' } }),
        });
        if (!response.ok) {
          throw new Error('Service injoignable');
        }

        const json = await response.json();

        if (!mountedRef.current) return;

        // Handle ApiResponse wrapper format
        const actualData = json.data !== undefined ? json.data : json;
        const stale = json._stale === true;

        setData(actualData as T);
        setIsStale(stale);
        setError(null);
        setLastUpdated(new Date());
        retryCountRef.current = 0;
        consecutiveFailsRef.current = 0;
      } catch (err) {
        if (!mountedRef.current) return;

        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // Retry with exponential backoff (only on initial/manual fetch, not scheduled)
        if (!isScheduled && retryCountRef.current < MAX_RETRIES) {
          const backoff = BACKOFF_BASE * Math.pow(2, retryCountRef.current);
          retryCountRef.current += 1;
          setTimeout(() => {
            if (mountedRef.current) {
              fetchingRef.current = false;
              fetchData(false);
            }
          }, backoff);
          return;
        }

        consecutiveFailsRef.current += 1;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          fetchingRef.current = false;
        }
      }
    },
    [url, interval],
  );

  const refresh = useCallback(async () => {
    retryCountRef.current = 0;
    consecutiveFailsRef.current = 0;
    lastManualRefreshRef.current = Date.now();
    if (trackCountdown) setNextRefreshIn(Math.floor(interval / 1000));
    // Restart the interval timer so next auto-refresh is a full interval from now
    setRefreshEpoch((e) => e + 1);
    await fetchData(false, true);
  }, [fetchData, interval, trackCountdown]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      fetchData(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [fetchData, enabled]);

  // Auto-refresh interval — skipped when autoRefresh is false (#16)
  // Restarted when refreshEpoch changes (manual refresh resets the timer, #22)
  useEffect(() => {
    if (!enabled || !autoRefresh) return;

    if (trackCountdown) setNextRefreshIn(Math.floor(interval / 1000));

    intervalIdRef.current = setInterval(() => {
      if (trackCountdown) setNextRefreshIn(Math.floor(interval / 1000));
      retryCountRef.current = 0;
      fetchData(true);
    }, interval);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [interval, fetchData, enabled, trackCountdown, autoRefresh, refreshEpoch]);

  // Countdown timer — only active when trackCountdown: true, ticks every 5s to reduce re-renders
  // Also restarts on refreshEpoch change to stay in sync with interval timer (#22)
  useEffect(() => {
    if (!enabled || !trackCountdown || !autoRefresh) return;

    countdownIdRef.current = setInterval(() => {
      setNextRefreshIn((prev) => Math.max(0, prev - 5));
    }, 5000);

    return () => {
      if (countdownIdRef.current) {
        clearInterval(countdownIdRef.current);
      }
    };
  }, [enabled, trackCountdown, autoRefresh, refreshEpoch]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    nextRefreshIn,
    isStale,
  };
}
