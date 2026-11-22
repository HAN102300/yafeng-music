'use client';

/**
 * useVisualizerQuality - 可视化质量档位（用户偏好，持久化）
 * - auto：默认。FPS 探针监测，卡顿自动降级
 * - high：强制完整特效（高配设备）
 * - low ：强制省电（heavy 场景替换静态渐变）
 * 存储：desktopStorage（桌面=Tauri Store 文件 / web=localStorage）
 */
import { useEffect, useState } from 'react';
import { desktopStorage } from '@/lib/desktopStorage';

export type VisualizerQuality = 'auto' | 'high' | 'low';

const KEY = 'viz:quality';

function normalize(v: unknown): VisualizerQuality {
  return v === 'high' || v === 'low' ? v : 'auto';
}

export function useVisualizerQuality(): { quality: VisualizerQuality; setQuality: (q: VisualizerQuality) => void } {
  const [quality, setQualityState] = useState<VisualizerQuality>('auto');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const v = await desktopStorage.getItem(KEY);
        if (!cancelled && v) setQualityState(normalize(v));
      } catch {
        /* 读失败保持默认 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setQuality = (q: VisualizerQuality) => {
    setQualityState(q);
    void (async () => {
      try {
        await desktopStorage.setItem(KEY, q);
      } catch {
        /* 写失败不影响本次会话 */
      }
    })();
  };

  return { quality, setQuality };
}
