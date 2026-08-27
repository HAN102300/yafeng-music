'use client';

/**
 * 频谱可视化组件（自驱动）
 * 柱状频谱，订阅全局帧调度器直接绘制，组件 0 重渲染。
 * 支持 devicePixelRatio 缩放与主题色低频刷新。
 */
import { useEffect, useRef } from 'react';
import { useAudioFrame } from '@/hooks/useAudioFrame';
import { readThemeColors, SceneThemeColors } from '@/lib/visualizer/themeColors';

interface SpectrumVisualizerProps {
  width?: number;
  height?: number;
  barCount?: number;
}

export function SpectrumVisualizer({
  width = 800,
  height = 200,
  barCount = 64,
}: SpectrumVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorsRef = useRef<SceneThemeColors>(readThemeColors());
  const tickRef = useRef(0);

  // DPR 缩放
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [width, height]);

  useAudioFrame((frame) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (tickRef.current++ % 30 === 0) {
      colorsRef.current = readThemeColors();
    }
    const { primary } = colorsRef.current;

    ctx.clearRect(0, 0, width, height);

    const data = frame.frequencyData;
    const barWidth = width / barCount;
    const step = Math.floor(data.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const value = data[i * step] / 255;
      const barHeight = value * height * 0.9;
      const x = i * barWidth;
      const y = height - barHeight;

      const gradient = ctx.createLinearGradient(x, y, x, height);
      gradient.addColorStop(0, primary);
      gradient.addColorStop(1, `${primary}33`);

      ctx.fillStyle = gradient;
      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);

      // 顶部发光点
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = value;
      ctx.fillRect(x + 1, y, barWidth - 2, 2);
      ctx.globalAlpha = 1;
    }
  });

  return <canvas ref={canvasRef} className="pointer-events-none" />;
}
