'use client';

/**
 * 频谱可视化组件（增强版）
 * 柱状频谱：平滑插值 + 主题渐变柱身 + 下落峰值帽 + 底部镜像倒影 + 节拍描边闪烁。
 * 订阅全局帧调度器直接绘制，组件 0 重渲染；devicePixelRatio 缩放 + 主题色低频刷新。
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
  // 平滑后的柱高 / 峰值位置（0-1），跨帧持续避免跳变
  const smoothRef = useRef<Float32Array>(new Float32Array(128));
  const peaksRef = useRef<Float32Array>(new Float32Array(128));

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
    const { primary, accent } = colorsRef.current;
    const beatFlash = frame.beat.isBeat ? 1 : 0;

    ctx.clearRect(0, 0, width, height);

    const data = frame.frequencyData;
    const barWidth = width / barCount;
    const step = Math.floor(data.length / barCount);
    const smooth = smoothRef.current;
    const peaks = peaksRef.current;
    const mainH = height * 0.62; // 主频谱区高度（下部 38% 留给镜像倒影）
    const maxBar = mainH * 0.92;

    for (let i = 0; i < barCount; i++) {
      const raw = data[Math.floor(i * step)] / 255;
      // 指数平滑：上升快、下降慢，视觉更丝滑
      const prev = smooth[i] ?? 0;
      smooth[i] = raw > prev ? prev + (raw - prev) * 0.55 : prev + (raw - prev) * 0.18;
      const value = smooth[i];

      // 峰值帽：缓慢下落
      peaks[i] = Math.max(peaks[i] - 0.006, value);

      const barHeight = value * maxBar;
      const peakY = mainH - peaks[i] * maxBar;
      const x = i * barWidth;
      const y = mainH - barHeight;

      // 柱身渐变（accent → primary → 透明）
      const gradient = ctx.createLinearGradient(x, y, x, mainH);
      gradient.addColorStop(0, accent);
      gradient.addColorStop(0.35, primary);
      gradient.addColorStop(1, `${primary}22`);
      ctx.fillStyle = gradient;
      // 圆角柱身
      roundRect(ctx, x + 1, y, barWidth - 2, barHeight, Math.min(3, barWidth / 3));
      ctx.fill();

      // 峰值帽（亮色小横条）
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.85;
      roundRect(ctx, x + 1, peakY, barWidth - 2, 2.5, 1);
      ctx.fill();
      ctx.globalAlpha = 1;

      // 底部镜像倒影（渐隐）
      const mirrorH = barHeight * 0.38;
      const mGrad = ctx.createLinearGradient(x, mainH, x, mainH + mirrorH);
      mGrad.addColorStop(0, `${primary}55`);
      mGrad.addColorStop(1, `${primary}00`);
      ctx.fillStyle = mGrad;
      ctx.fillRect(x + 1, mainH, barWidth - 2, mirrorH);
    }

    // 节拍描边闪烁：低音冲击时基线发亮
    if (beatFlash || frame.bass > 0.5) {
      ctx.fillStyle = `${accent}${frame.beat.isBeat ? 'cc' : '55'}`;
      ctx.fillRect(0, mainH - 1, width, 1.5);
    }
  });

  return <canvas ref={canvasRef} className="pointer-events-none" />;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const hh = Math.max(h, 0.01);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + hh, r);
  ctx.arcTo(x + w, y + hh, x, y + hh, r);
  ctx.arcTo(x, y + hh, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
