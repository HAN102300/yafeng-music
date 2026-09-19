'use client';

/**
 * SceneManager - 全屏背景场景挂载
 * 强制同屏最多 1 个全屏 WebGL context：
 * AnimatePresence mode="wait" 保证旧场景先卸载（WebGL context 释放）再挂载新场景。
 * low 质量档下 heavy 场景替换为静态渐变。
 * 中央可视化由沉浸页自行绘制，不在此层。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { getScene } from '@/lib/visualizer/registry';
import type { QualityTier } from '@/hooks/useQualityTier';

interface SceneManagerProps {
  sceneId: string;
  coverUrl?: string;
  quality?: QualityTier;
}

export function SceneManager({ sceneId, coverUrl, quality = 'high' }: SceneManagerProps) {
  const scene = getScene(sceneId);
  const isFullscreen = scene.placement === 'fullscreen';
  const degraded = quality === 'low' && scene.quality === 'heavy';

  return (
    <div className="fixed inset-0 z-[1] overflow-hidden pointer-events-none">
      <AnimatePresence mode="wait">
        {isFullscreen && scene.Component && (
          <motion.div
            key={scene.id}
            className="absolute inset-0 pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {degraded ? (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 40%, rgba(168,85,247,0.25) 0%, rgba(12,12,29,0.9) 70%)',
                }}
              />
            ) : (
              <scene.Component coverUrl={coverUrl} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
