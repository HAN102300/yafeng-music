'use client';

/**
 * SceneManager - 场景互斥挂载管理
 * 强制同屏最多 1 个全屏 WebGL context：
 * AnimatePresence mode="wait" 保证旧场景先卸载（WebGL context 释放）再挂载新场景。
 * low 质量档下 heavy 场景替换为静态渐变。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { getScene } from '@/lib/visualizer/registry';
import { CircularVisualizer } from '@/components/visualizer/CircularVisualizer';
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
    <>
      {/* 全屏场景层（互斥挂载；fixed 逃离中央容器，铺满视口） */}
      <div className="fixed inset-0 z-[1] overflow-hidden pointer-events-none">
        <AnimatePresence mode="wait">
          {isFullscreen && (
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

      {/* 中央可视化区（互斥切换） */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`center-${scene.id}`}
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotate: 5 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="relative z-10"
        >
          {isFullscreen ? (
            // 全屏场景时中央显示迷你封面圆环，保留音频反馈焦点
            <CircularVisualizer size={240} showCover coverUrl={coverUrl} />
          ) : (
            <scene.Component coverUrl={coverUrl} />
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
