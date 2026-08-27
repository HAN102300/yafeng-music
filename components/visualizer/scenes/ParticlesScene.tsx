'use client';

/**
 * 星尘场景 - React Bits Particles(ogl) 适配层
 * 音频反馈不进 Particles props（props 变化会重建 WebGL context），
 * 而是用 useAudioFrame 直接操作容器 DOM（缩放/透明度随低频呼吸），零重渲染。
 */
import { useRef } from 'react';
import Particles from '@/components/ui/reactbits/Particles';
import { useAudioFrame } from '@/hooks/useAudioFrame';

export default function ParticlesScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useAudioFrame((frame) => {
    const el = containerRef.current;
    if (!el) return;
    const scale = 1 + frame.bass * 0.08;
    el.style.transform = `scale(${scale})`;
    el.style.opacity = `${0.7 + frame.energy * 0.3}`;
  });

  return (
    <div ref={containerRef} className="absolute inset-0 will-change-transform">
      <Particles
        particleCount={300}
        particleSpread={12}
        speed={0.15}
        particleColors={['#a855f7', '#ec4899', '#06b6d4', '#ffffff']}
        alphaParticles
        particleBaseSize={90}
        moveParticlesOnHover
        particleHoverFactor={0.5}
      />
    </div>
  );
}
