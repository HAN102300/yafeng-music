'use client';

/**
 * SceneManager - 全屏背景场景挂载
 * 强制同屏最多 1 个全屏 WebGL context：
 * AnimatePresence mode="wait" 保证旧场景先卸载（WebGL context 释放）再挂载新场景。
 * low 质量档下 heavy 场景替换为静态渐变；auto 档由 FPS 探针实时判定。
 * 中央可视化由沉浸页自行绘制，不在此层。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { getScene } from '@/lib/visualizer/registry';
import { useFpsGuard } from '@/hooks/useFpsGuard';
import type { VisualizerQuality } from '@/hooks/useVisualizerQuality';

interface SceneManagerProps {
  sceneId: string;
  coverUrl?: string;
  quality?: VisualizerQuality;
}

export function SceneManager({ sceneId, coverUrl, quality = 'auto' }: SceneManagerProps) {
  const scene = getScene(sceneId);
  // auto 档：帧率探针实时降级（high/low 由用户固定）
  const fpsDegraded = useFpsGuard({ enabled: quality === 'auto' });
  const effectiveLow = quality === 'low' || (quality === 'auto' && fpsDegraded);
  // 省电判定：heavy 场景一律降级；light 场景（Canvas 2D）省电档同样替换为静态氛围，
  // 保证「省电」档位有全场景可见的明确效果
  const degraded = effectiveLow;

  return (
    <div className="fixed inset-0 z-[1] overflow-hidden pointer-events-none">
      <AnimatePresence mode="wait">
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
      </AnimatePresence>
    </div>
  );
}
