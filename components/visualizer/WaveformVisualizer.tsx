'use client';

/**
 * 波形可视化组件（自驱动）
 * 音频时域波形 + 多层发光，订阅全局帧调度器直接绘制，组件 0 重渲染。
 */
import { useEffect, useRef } from 'react';
import { useAudioFrame } from '@/hooks/useAudioFrame';
import { readThemeColors, SceneThemeColors } from '@/lib/visualizer/themeColors';

interface WaveformVisualizerProps {
  width?: number;
  height?: number;
}

export function WaveformVisualizer({
  width = 800,
  height = 200,
}: WaveformVisualizerProps) {
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
    const { accent } = colorsRef.current;

    ctx.clearRect(0, 0, width, height);

    const { waveformData } = frame;
    const centerY = height / 2;
    const sliceWidth = width / waveformData.length;

    // 绘制多层波形（发光效果，无 shadowBlur）
    for (let layer = 3; layer >= 0; layer--) {
      ctx.beginPath();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2 + layer * 2;
      ctx.globalAlpha = 0.3 - layer * 0.07;

      for (let i = 0; i < waveformData.length; i++) {
        const value = (waveformData[i] - 128) / 128;
        const y = centerY + value * height * 0.4;
        const x = i * sliceWidth;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // 绘制填充区域
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    for (let i = 0; i < waveformData.length; i++) {
      const value = (waveformData[i] - 128) / 128;
      const y = centerY + value * height * 0.4;
      const x = i * sliceWidth;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, centerY);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `${accent}44`);
    gradient.addColorStop(0.5, `${accent}11`);
    gradient.addColorStop(1, `${accent}44`);
    ctx.fillStyle = gradient;
    ctx.fill();
  });

  return <canvas ref={canvasRef} className="pointer-events-none" />;
}
