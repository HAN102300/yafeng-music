'use client';

/**
 * 可视化场景注册表 - 全部场景的唯一定义处
 * （收敛旧版散落在 3 个文件的 VisualizerMode union 与名称/图标映射）
 *
 * - 每个场景都是一层全屏背景（fixed inset-0），沉浸页中央圆环由其自身渲染，不在此列
 * - quality: 'heavy' 场景（WebGL）一律 next/dynamic({ ssr:false }) 懒加载，
 *   由 SceneManager 保证同屏最多 1 个全屏 WebGL context
 */
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

export interface SceneProps {
  coverUrl?: string;
}

export interface VisualizerScene {
  id: string;
  name: string;
  icon: string;
  quality: 'light' | 'heavy';
  Component: ComponentType<SceneProps>;
}

// ---- heavy 场景：懒加载 + 禁 SSR ----

const sceneLoading = () => (
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
  </div>
);

const ParticleBackground = dynamic(
  () => import('@/components/visualizer/ParticleBackground').then((m) => m.ParticleBackground),
  { ssr: false, loading: sceneLoading }
);

const ParticlesScene = dynamic(() => import('@/components/visualizer/scenes/ParticlesScene'), {
  ssr: false,
  loading: sceneLoading,
});

const ThreadsScene = dynamic(() => import('@/components/visualizer/scenes/ThreadsScene'), {
  ssr: false,
  loading: sceneLoading,
});

const ParticleField = dynamic(() => import('@/components/three/ParticleField'), {
  ssr: false,
  loading: sceneLoading,
});

// light 全屏场景：Canvas 2D 流光频谱背景（低配设备可用）
const FlowSpectrum = dynamic(() => import('@/components/visualizer/scenes/FlowSpectrumBackground').then((m) => m.FlowSpectrumBackground), {
  ssr: false,
  loading: sceneLoading,
});

// light 全屏场景：同心环形频谱光晕
const RingHalo = dynamic(() => import('@/components/visualizer/scenes/RingHaloBackground').then((m) => m.RingHaloBackground), {
  ssr: false,
  loading: sceneLoading,
});

// light 全屏场景：贴底「声景地平线」频谱
const HorizonSpectrum = dynamic(() => import('@/components/visualizer/FullBleedScene').then((m) => m.FullBleedScene), {
  ssr: false,
  loading: sceneLoading,
});

function R3FParticlesScene() {
  return <ParticleBackground className="absolute inset-0" particleCount={2000} />;
}

function StarTunnelScene() {
  return <ParticleField className="absolute inset-0" />;
}

function OglParticlesScene() {
  return <ParticlesScene />;
}

function OglThreadsScene() {
  return <ThreadsScene />;
}

function FlowScene() {
  return <FlowSpectrum />;
}

function RingHaloScene() {
  return <RingHalo />;
}

function HorizonScene() {
  return <HorizonSpectrum heightRatio={0.3} opacity={0.6} />;
}

// ---- 注册表 ----

export const SCENES: VisualizerScene[] = [
  { id: 'flow', name: '流光频谱', icon: '🌊', quality: 'light', Component: FlowScene },
  { id: 'circular', name: '环形音浪', icon: '🔮', quality: 'light', Component: RingHaloScene },
  { id: 'spectrum', name: '频谱分析', icon: '📊', quality: 'light', Component: HorizonScene },
  { id: 'particles', name: '粒子宇宙', icon: '✨', quality: 'heavy', Component: R3FParticlesScene },
  { id: 'stardust', name: '星尘漂浮', icon: '🌌', quality: 'heavy', Component: OglParticlesScene },
  { id: 'threads', name: '丝弦波动', icon: '🎻', quality: 'heavy', Component: OglThreadsScene },
  { id: 'startunnel', name: '星际穿越', icon: '🚀', quality: 'heavy', Component: StarTunnelScene },
];

export function getScene(id: string): VisualizerScene {
  return SCENES.find((s) => s.id === id) ?? SCENES[0];
}
