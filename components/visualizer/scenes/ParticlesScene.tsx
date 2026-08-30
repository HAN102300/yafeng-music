'use client';

/**
 * 星尘场景（ogl Particles）——增强版
 * - 粒子数量提升 + 节拍辉光 overlay
 * - 音频反馈全走容器 DOM（缩放/旋转/透明度随频段呼吸），零重渲染、不重建 WebGL context
 */
import { useEffect, useRef } from 'react';
import Particles from '@/components/ui/reactbits/Particles';
import { useAudioFrame } from '@/hooks/useAudioFrame';
import { readThemeColors, SceneThemeColors } from '@/lib/visualizer/themeColors';

export default function ParticlesScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const colorsRef = useRef<SceneThemeColors>(readThemeColors());
  const tickRef = useRef(0);
  const rotRef = useRef(0);
  const beatRef = useRef(0);

  // 辉光 overlay 颜色低频跟随主题（粒子颜色为静态 props 不重建 context）
  useEffect(() => {
    const t = setInterval(() => {
      colorsRef.current = readThemeColors();
      if (glowRef.current) {
        glowRef.current.style.background =
          `radial-gradient(ellipse at 50% 60%, ${colorsRef.current.glow.replace(/[\d.]+\)$/, '0.22)')} 0%, transparent 65%)`;
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useAudioFrame((frame) => {
    const el = containerRef.current;
    if (!el) return;

    if (tickRef.current++ % 20 === 0) {
      colorsRef.current = readThemeColors();
    }
    beatRef.current = frame.beat.isBeat ? 1 : beatRef.current * 0.93;

    // 缩放呼吸更强（低音）+ 缓慢旋转（中频驱动转速）
    const scale = 1 + frame.bass * 0.14 + beatRef.current * 0.03;
    rotRef.current += 0.02 + frame.mid * 0.05;
    el.style.transform = `scale(${scale}) rotate(${rotRef.current.toFixed(3)}deg)`;
    el.style.opacity = `${0.72 + frame.energy * 0.28}`;

    // 节拍辉光
    if (glowRef.current) {
      glowRef.current.style.opacity = `${0.25 + frame.bass * 0.55 + beatRef.current * 0.2}`;
    }
  });

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 will-change-transform">
        <Particles
          particleCount={520}
          particleSpread={14}
          speed={0.22}
          particleColors={['#a855f7', '#ec4899', '#06b6d4', '#ffffff']}
          alphaParticles
          particleBaseSize={110}
          moveParticlesOnHover
          particleHoverFactor={0.6}
        />
      </div>
      {/* 节拍辉光 overlay */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.3,
          background:
            'radial-gradient(ellipse at 50% 60%, rgba(168,85,247,0.22) 0%, transparent 65%)',
        }}
      />
    </div>
  );
}
