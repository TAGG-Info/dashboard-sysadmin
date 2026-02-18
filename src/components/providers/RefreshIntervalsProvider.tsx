'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface RefreshIntervals {
  prtg: number;
  infra: number;
  veeam: number;
  tickets: number;
  transfers: number;
}

interface RefreshIntervalsContextValue {
  intervals: RefreshIntervals;
  updateIntervals: (partial: Partial<RefreshIntervals>) => Promise<boolean>;
  loading: boolean;
}

// Initial defaults from env vars (same values hooks currently use)
const DEFAULTS: RefreshIntervals = {
  prtg: Math.max(10000, Number(process.env.NEXT_PUBLIC_REFRESH_PRTG) || 30000),
  infra: Math.max(10000, Number(process.env.NEXT_PUBLIC_REFRESH_INFRA) || 60000),
  veeam: Math.max(10000, Number(process.env.NEXT_PUBLIC_REFRESH_VEEAM) || 120000),
  tickets: Math.max(10000, Number(process.env.NEXT_PUBLIC_REFRESH_TICKETS) || 60000),
  transfers: Math.max(10000, Number(process.env.NEXT_PUBLIC_REFRESH_TRANSFERS) || 120000),
};

const RefreshIntervalsContext = createContext<RefreshIntervalsContextValue>({
  intervals: DEFAULTS,
  updateIntervals: async () => false,
  loading: true,
});

export function useRefreshIntervals() {
  return useContext(RefreshIntervalsContext);
}

export function RefreshIntervalsProvider({ children }: { children: React.ReactNode }) {
  const [intervals, setIntervals] = useState<RefreshIntervals>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    fetch('/api/settings/refresh')
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        if (mountedRef.current && data?.intervals) {
          setIntervals(data.intervals);
        }
      })
      .catch(() => {
        // Keep DEFAULTS — works the same as before
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => { mountedRef.current = false; };
  }, []);

  const updateIntervals = useCallback(async (partial: Partial<RefreshIntervals>): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings/refresh', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervals: partial }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data?.intervals) {
        setIntervals(data.intervals);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <RefreshIntervalsContext.Provider value={{ intervals, updateIntervals, loading }}>
      {children}
    </RefreshIntervalsContext.Provider>
  );
}
