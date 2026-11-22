'use client';

/**
 * useFpsGuard - 帧率探针自动降级
 *
 * 用 requestAnimationFrame 统计实际帧率：连续 lowSeconds 秒平均 FPS 低于
 * threshold 时触发一次降级回调（degraded=true）。触发后停止探针——
 * 降级是单向的（避免「恢复→再降」震荡），刷新页面重置。
 *
 * 仅在组件挂载且 enabled 时工作；探针自身开销 ~0（每帧只做加法）。
 */
import { useEffect, useRef, useState } from 'react';

interface FpsGuardOptions {
  /** FPS 低于此值视为卡顿 */
  threshold?: number;
  /** 需要连续低于阈值的时长（秒） */
  lowSeconds?: number;
  /** 是否启用探针（如用户已手动选省电档则无需监测） */
  enabled?: boolean;
  /** 页面可见性：不可见时暂停统计（后台 tab 不算卡顿） */
}

export function useFpsGuard(options: FpsGuardOptions = {}) {
  const { threshold = 30, lowSeconds = 5, enabled = true } = options;
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let frames = 0;
    let windowStart = performance.now();
    let stopped = false;

    const tick = (now: number) => {
      if (stopped) return;
      frames++;
      const elapsed = now - windowStart;
      // 每 2 秒结算一次平均帧率
      if (elapsed >= 2000) {
        const fps = (frames * 1000) / elapsed;
        frames = 0;
        windowStart = now;
        if (fps < threshold) {
          // 记录连续低帧时长
          lowStreak += 2;
          if (lowStreak >= lowSeconds) {
            setDegraded(true);
            stopped = true; // 一次性降级，不再监测
            return;
          }
        } else {
          lowStreak = 0;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    let lowStreak = 0;

    // 页面不可见时暂停统计
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        frames = 0;
        windowStart = performance.now();
        lowStreak = 0;
      } else if (!stopped) {
        windowStart = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [threshold, lowSeconds, enabled]);

  return degraded;
}
