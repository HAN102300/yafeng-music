'use client';

/**
 * LazyList - 长列表滚动位置懒加载（分片渲染）
 *
 * 策略：IntersectionObserver 观察列表尾部的哨兵元素，接近视口时追加渲染下一批。
 * 相比容器式虚拟滚动（react-window）：不改变页面滚动流、行高无需固定、
 * 已渲染的行保留 DOM（动画/状态不丢失），改造风险小。
 *
 * 适用于：曲目列表、队列抽屉等任意「大数组 + 逐项渲染」场景。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface LazyListProps<T> {
  items: T[];
  /** 每批渲染条数 */
  batchSize?: number;
  /** 单项渲染器：(item, 全局索引) => ReactNode */
  renderItem: (item: T, index: number) => ReactNode;
  /** 容器 className（透传给外层） */
  className?: string;
  /** items 变化时重置到首批（如搜索换关键词） */
  resetKey?: string | number;
}

export function LazyList<T>({ items, batchSize = 50, renderItem, className, resetKey }: LazyListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 数据源标识变化（换页/换关键词）时重置
  useEffect(() => {
    setVisibleCount(batchSize);
  }, [resetKey, batchSize]);

  // 哨兵进入视口 → 追加一批
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && visibleCount < items.length) {
          setVisibleCount((c) => Math.min(c + batchSize, items.length));
        }
      },
      { rootMargin: '600px' } // 提前 600px 预渲染，滚动无白屏
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, items.length, batchSize]);

  // 数据量缩小时收敛
  const safeCount = Math.min(visibleCount, items.length);

  return (
    <div className={className}>
      {items.slice(0, safeCount).map((item, i) => renderItem(item, i))}
      {/* 哨兵：还有剩余未渲染项时才挂载 */}
      {safeCount < items.length && (
        <div ref={sentinelRef} className="h-1" aria-hidden />
      )}
    </div>
  );
}
