'use client';

/**
 * 弹层打开期间锁定页面滚动：
 * - 锁定 body overflow（原生滚动）
 * - 同步停掉 lenis 平滑滚动（防止 wheel 事件继续驱动窗口滚动）
 * - 恢复时还原原值
 * 配合弹层滚动容器上的 overscroll-contain，彻底消除滚动穿透。
 */
import { useEffect } from 'react';

export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const lenis = window.__lenis;
    const lenisWasRunning = !!lenis && !lenis.isStopped;
    lenis?.stop();

    return () => {
      body.style.overflow = prevOverflow;
      if (lenis && lenisWasRunning) lenis.start();
    };
  }, [locked]);
}
