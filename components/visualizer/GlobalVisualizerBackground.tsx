'use client';

/**
 * 全局背景视觉层（挂载于根布局，所有页面可见）
 * 三层结构：
 *  1. 封面主色氛围渐变（canvas 取色 → --cover-color CSS 变量）
 *  2. 音频驱动的全屏可视化场景（可开关；low 档设备 heavy 场景自动回落流光频谱）
 *  3. 可读性渐变遮罩（保证内容区文字对比度）
 */
import { useEffect, useState } from 'react';
import { useMusicStore } from '@/lib/store';
import { useQualityTier } from '@/hooks/useQualityTier';
import { getScene } from '@/lib/visualizer/registry';
import { SceneManager } from '@/components/visualizer/SceneManager';
import { extractDominantColor } from '@/lib/coverColor';

export function GlobalVisualizerBackground() {
  const currentSong = useMusicStore((s) => s.currentSong);
  const globalVizEnabled = useMusicStore((s) => s.globalVizEnabled);
  const sceneId = useMusicStore((s) => s.visualizerSceneId);
  const quality = useQualityTier();

  const [coverRgb, setCoverRgb] = useState<string | null>(null);

  // 封面主色提取 → CSS 变量（全站氛围色）
  useEffect(() => {
    let cancelled = false;
    if (!currentSong?.cover) return;
    extractDominantColor(currentSong.cover).then((res) => {
      if (cancelled) return;
      const rgb = res?.rgb ?? '168,85,247';
      setCoverRgb(rgb);
      document.documentElement.style.setProperty('--cover-color', rgb);
    });
    return () => {
      cancelled = true;
    };
  }, [currentSong?.cover]);

  // low 档且选中 heavy 场景 → 回落到流光频谱（避免低配设备 WebGL 负担）
  const scene = getScene(sceneId);
  const effectiveId =
    globalVizEnabled && quality === 'low' && scene.quality === 'heavy' ? 'flow' : sceneId;
  const showScene = globalVizEnabled;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* 1. 封面主色氛围 */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={
          coverRgb
            ? {
                background: `radial-gradient(ellipse at 50% -10%, rgba(${coverRgb},0.22) 0%, rgba(10,10,26,0) 55%)`,
              }
            : undefined
        }
      />

      {/* 2. 全屏可视化场景 */}
      {showScene && (
        <SceneManager
          sceneId={effectiveId}
          coverUrl={currentSong?.cover}
          quality={quality}
          backgroundOnly
        />
      )}

      {/* 3. 可读性遮罩 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-dark-base) 60%, transparent) 0%, color-mix(in srgb, var(--color-dark-base) 20%, transparent) 26%, color-mix(in srgb, var(--color-dark-base) 20%, transparent) 66%, color-mix(in srgb, var(--color-dark-base) 78%, transparent) 100%)',
        }}
      />
    </div>
  );
}
