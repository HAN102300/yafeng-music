'use client';

/**
 * 环形可视化组件（自驱动）
 * 圆形频谱 + 专辑封面。
 * 订阅全局帧调度器在自身 rAF 回调内直接绘制 canvas，组件 0 重渲染：
 * - 封面图挂载时缓存一次（旧版每帧 new Image() 已修复）
 * - devicePixelRatio 缩放，高分屏不模糊
 * - 主题色每 30 帧从 CSS 变量刷新
 */
import { useEffect, useRef } from 'react';
import { useAudioFrame } from '@/hooks/useAudioFrame';
import { readThemeColors, SceneThemeColors } from '@/lib/visualizer/themeColors';

interface CircularVisualizerProps {
  size?: number;
  showCover?: boolean;
  coverUrl?: string;
}

export function CircularVisualizer({
  size = 300,
  showCover = true,
  coverUrl,
}: CircularVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coverImgRef = useRef<HTMLImageElement | null>(null);
  const colorsRef = useRef<SceneThemeColors>(readThemeColors());
  const tickRef = useRef(0);

  // 封面挂载时缓存一次
  useEffect(() => {
    coverImgRef.current = null;
    if (!coverUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      coverImgRef.current = img;
    };
    img.src = coverUrl;
  }, [coverUrl]);

  // DPR 缩放
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [size]);

  useAudioFrame((frame) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // 主题色低频刷新
    if (tickRef.current++ % 30 === 0) {
      colorsRef.current = readThemeColors();
    }
    const { primary, glow } = colorsRef.current;

    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = size * 0.42;
    const innerRadius = showCover ? size * 0.25 : size * 0.15;
    const barCount = 64;
    const { frequencyData } = frame;
    const step = Math.floor(frequencyData.length / barCount);

    // 绘制环形频谱条（无逐条 shadowBlur，发光由径向渐变整体实现）
    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i * step] / 255;
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      const barLength = value * (outerRadius - innerRadius) * 0.8;

      const x1 = centerX + Math.cos(angle) * innerRadius;
      const y1 = centerY + Math.sin(angle) * innerRadius;
      const x2 = centerX + Math.cos(angle) * (innerRadius + barLength);
      const y2 = centerY + Math.sin(angle) * (innerRadius + barLength);

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, `${primary}88`);
      gradient.addColorStop(1, primary);

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // 整体柔光（单次径向渐变替代逐条 shadowBlur）
    const glowRadius = outerRadius * (1 + frame.energy * 0.3);
    const glowGradient = ctx.createRadialGradient(
      centerX, centerY, innerRadius,
      centerX, centerY, glowRadius
    );
    glowGradient.addColorStop(0, 'rgba(0,0,0,0)');
    glowGradient.addColorStop(0.7, glow.replace(/[\d.]+\)$/, `${0.05 + frame.energy * 0.15})`));
    glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, size, size);

    // 外圈
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `${primary}44`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // 内圈
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `${primary}66`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // 专辑封面（缓存图，节拍轻微缩放）
    const coverImg = coverImgRef.current;
    if (showCover && coverImg) {
      const beatScale = 1 + frame.beat.phase * 0 + frame.bass * 0.06;
      const coverSize = innerRadius * 1.6 * beatScale;
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, coverSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        coverImg,
        centerX - coverSize / 2,
        centerY - coverSize / 2,
        coverSize,
        coverSize
      );
      ctx.restore();
    }

    // 中心装饰
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fillStyle = primary;
    ctx.fill();
  });

  return <canvas ref={canvasRef} className="pointer-events-none" />;
}
