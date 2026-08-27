'use client';

/**
 * useQualityTier - 设备质量分档
 * 检测 prefers-reduced-motion / CPU 核数 / 内存，输出 high/medium/low。
 * low 档：ogl 场景替换为静态渐变、粒子数减档、装饰粒子禁用。
 */
import { useEffect, useState } from 'react';

export type QualityTier = 'high' | 'medium' | 'low';

export function useQualityTier(): QualityTier {
  const [tier, setTier] = useState<QualityTier>('high');

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cores = navigator.hardwareConcurrency ?? 8;
    const memory = (navigator as { deviceMemory?: number }).deviceMemory ?? 8;

    if (reducedMotion) {
      setTier('low');
    } else if (cores <= 4 || memory <= 4) {
      setTier('medium');
    }
  }, []);

  return tier;
}
