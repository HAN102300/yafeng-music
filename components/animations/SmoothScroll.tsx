'use client';

/**
 * SmoothScroll - 基于 Lenis 的全局丝滑滚动
 * 挂载于根布局，接管原生滚动，与锚点跳转、framer-motion 动画兼容。
 * 实例挂在 window.__lenis 供弹层锁定/恢复滚动使用（useBodyScrollLock）。
 */
import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export default function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;
    window.__lenis = lenis;

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      if (window.__lenis === lenis) window.__lenis = undefined;
    };
  }, []);

  return null;
}
