'use client';

/**
 * useDragPercent - 拖拽进度/音量条
 * 支持鼠标/触摸拖拽与点击，返回容器 ref、拖拽状态与实时百分比。
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export function useDragPercent(onChange: (percent: number) => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [percent, setPercent] = useState(0);

  const compute = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      if (clientX == null) return;
      const p = compute(clientX);
      setPercent(p);
      onChange(p);
    },
    [compute, onChange]
  );

  const stop = useCallback(() => {
    setIsDragging(false);
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', stop);
    window.removeEventListener('touchmove', handleMove);
    window.removeEventListener('touchend', stop);
  }, [handleMove]);

  const start = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      if (clientX == null) return;
      const p = compute(clientX);
      setPercent(p);
      onChange(p);
      setIsDragging(true);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', stop);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', stop);
    },
    [compute, handleMove, onChange, stop]
  );

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { containerRef, isDragging, percent, start };
}