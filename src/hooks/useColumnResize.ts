'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useColumnResize(defaultWidths: number[]) {
  const [widths, setWidths] = useState<number[]>(defaultWidths);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => { cleanupRef.current?.(); }, []);

  const startResize = useCallback((e: React.PointerEvent<HTMLDivElement>, colIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = widths[colIndex];

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      setWidths(prev => {
        const next = [...prev];
        next[colIndex] = Math.max(40, startWidth + delta);
        return next;
      });
    };

    const cleanup = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', cleanup);
      cleanupRef.current = null;
    };

    cleanupRef.current = cleanup;
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', cleanup);
  }, [widths]);

  const resetWidths = useCallback(() => setWidths(defaultWidths), [defaultWidths]);

  return { widths, startResize, resetWidths };
}
