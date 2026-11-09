'use client';

/**
 * useDragPercent - 拖拽进度/音量条
 * 支持鼠标/触摸拖拽与点击，返回容器 ref、拖拽状态与实时百分比。
 *
 * onChange 经 ref 读取而非进依赖数组：调用方一律传内联箭头函数，宿主组件
 * 播放期约 4Hz 重渲染，若 onChange 参与 handler 身份，拖拽中途 stop 会换身份，
 * 卸载清理 effect 提前把 isDragging 置 false（进度条宽度回弹）并残留旧闭包。
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export function useDragPercent(onChange: (percent: number) => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [percent, setPercent] = useState(0);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const compute = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    // 折叠/零宽容器上 rect.width 为 0，直接除会得到 NaN 并污染进度
    if (!rect || rect.width === 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      if (clientX == null) return;
      const p = compute(clientX);
      setPercent(p);
      onChangeRef.current(p);
    },
    [compute]
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
      onChangeRef.current(p);
      setIsDragging(true);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', stop);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', stop);
    },
    [compute, handleMove, stop]
  );

  useEffect(() => () => stop(), [stop]);

  return { containerRef, isDragging, percent, start };
}
