'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutoRefreshOptions {
  url: string;
  interval: number; // ms
  enabled?: boolean;
  /**
   * Set to true only when the consumer displays `nextRefreshIn` (e.g. RefreshButton).
   * When false (default), the countdown interval is skipped — eliminates ~1 re-render/5s per hook instance.
   */
  trackCountdown?: boolean;
}

interface UseAutoRefreshReturn<T> {
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
  const { url, interval, enabled = true, trackCountdown = false } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(Math.floor(interval / 1000));
  const [isStale, setIsStale] = useState(false);

  const retryCountRef = useRef(0);
  const consecutiveFailsRef = useRef(0);
  const scheduledCountRef = useRef(0);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(
    async (isScheduled = false) => {
      if (fetchingRef.current) return;

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
      setLoading(true);

      try {
        const response = await fetch(url);
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
    [url],
  );

  const refresh = useCallback(async () => {
    retryCountRef.current = 0;
    consecutiveFailsRef.current = 0;
    if (trackCountdown) setNextRefreshIn(Math.floor(interval / 1000));
    await fetchData(false);
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

  // Auto-refresh interval
  useEffect(() => {
    if (!enabled) return;

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
  }, [interval, fetchData, enabled, trackCountdown]);

  // Countdown timer — only active when trackCountdown: true, ticks every 5s to reduce re-renders
  useEffect(() => {
    if (!enabled || !trackCountdown) return;

    countdownIdRef.current = setInterval(() => {
      setNextRefreshIn((prev) => Math.max(0, prev - 5));
    }, 5000);

    return () => {
      if (countdownIdRef.current) {
        clearInterval(countdownIdRef.current);
      }
    };
  }, [enabled, trackCountdown]);

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
