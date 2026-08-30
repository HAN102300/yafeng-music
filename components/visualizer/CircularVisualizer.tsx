'use client';

/**
 * 环形可视化组件（增强版）
 * 双层环形频谱（外层随低音呼吸、内层反向旋转）+ 峰值下落帽 + 专辑封面节拍缩放
 * + 整体柔光。订阅全局帧调度器直接绘制，组件 0 重渲染。
 */
import { useEffect, useRef } from 'react';
import { useAudioFrame } from '@/hooks/useAudioFrame';
import { readThemeColors, SceneThemeColors } from '@/lib/visualizer/themeColors';
import { isIdleFrame, idleSpectrumAt } from '@/lib/visualizer/idleMotion';

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
  const smoothRef = useRef<Float32Array>(new Float32Array(96));
  const peaksRef = useRef<Float32Array>(new Float32Array(96));
  const rotRef = useRef(0);

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
    const { primary, glow, accent } = colorsRef.current;

    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = size * 0.42;
    const innerRadius = showCover ? size * 0.25 : size * 0.15;
    const barCount = 96;
    const { frequencyData } = frame;
    const step = Math.floor(frequencyData.length / barCount);
    // 空闲兜底：暂停且静默时以伪频谱行波驱动，圆环不冻死
    const idle = isIdleFrame(frame);
    const tNow = performance.now() / 1000;
    const smooth = smoothRef.current;
    const peaks = peaksRef.current;
    // 内层环缓慢反向旋转
    rotRef.current -= 0.0022 + frame.mid * 0.004;

    // 低音呼吸：内外圈半径随低频轻微扩张
    const bassPulse = 1 + frame.bass * 0.12;

    // 绘制环形频谱：双层（外层主环 + 内层细环反向旋转）
    for (let i = 0; i < barCount; i++) {
      const raw = idle ? idleSpectrumAt(i / barCount, tNow) : frequencyData[Math.floor(i * step)] / 255;
      const prev = smooth[i] ?? 0;
      smooth[i] = raw > prev ? prev + (raw - prev) * 0.5 : prev + (raw - prev) * 0.16;
      const value = smooth[i];
      peaks[i] = Math.max((peaks[i] ?? 0) - 0.005, value);

      // ---- 外层主环（accent → primary 渐变，随低音外扩） ----
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      const r1 = innerRadius * 1.06;
      const barLength = value * (outerRadius * bassPulse - r1) * 0.92;
      const x1 = centerX + Math.cos(angle) * r1;
      const y1 = centerY + Math.sin(angle) * r1;
      const x2 = centerX + Math.cos(angle) * (r1 + barLength);
      const y2 = centerY + Math.sin(angle) * (r1 + barLength);

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, `${primary}66`);
      gradient.addColorStop(0.6, primary);
      gradient.addColorStop(1, accent);
      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = Math.max(2.5, (size / 300) * 3);
      ctx.lineCap = 'round';
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // 峰值帽（白点，缓慢下落）
      const peakLen = peaks[i] * (outerRadius * bassPulse - r1) * 0.92;
      const px = centerX + Math.cos(angle) * (r1 + peakLen + 4);
      const py = centerY + Math.sin(angle) * (r1 + peakLen + 4);
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1.2, size / 300), 0, Math.PI * 2);
      // accent 而非白色：浅色主题下白点不可见
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;

      // ---- 内层细环（反向旋转，纯 primary 低透明度，增加层次） ----
      const iAngle = angle * 1 + rotRef.current;
      const ir1 = innerRadius * 0.82;
      const iLen = value * innerRadius * 0.22;
      const ix1 = centerX + Math.cos(iAngle) * ir1;
      const iy1 = centerY + Math.sin(iAngle) * ir1;
      const ix2 = centerX + Math.cos(iAngle) * (ir1 + iLen);
      const iy2 = centerY + Math.sin(iAngle) * (ir1 + iLen);
      ctx.beginPath();
      ctx.strokeStyle = `${primary}77`;
      ctx.lineWidth = 1.5;
      ctx.moveTo(ix1, iy1);
      ctx.lineTo(ix2, iy2);
      ctx.stroke();
    }

    // 整体柔光（单次径向渐变替代逐条 shadowBlur）
    const glowRadius = outerRadius * (1 + frame.energy * 0.35);
    const glowGradient = ctx.createRadialGradient(
      centerX, centerY, innerRadius,
      centerX, centerY, glowRadius
    );
    glowGradient.addColorStop(0, 'rgba(0,0,0,0)');
    glowGradient.addColorStop(0.7, glow.replace(/[\d.]+\)$/, `${0.05 + frame.energy * 0.18})`));
    glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, size, size);

    // 外圈（随低音呼吸）
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius * bassPulse, 0, Math.PI * 2);
    ctx.strokeStyle = `${primary}55`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 内圈
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `${primary}77`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // 专辑封面（缓存图，低音缩放脉冲更强）
    const coverImg = coverImgRef.current;
    if (showCover && coverImg) {
      const beatScale = 1 + frame.bass * 0.09;
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

      // 封面外发光环（节拍时更亮）
      ctx.beginPath();
      ctx.arc(centerX, centerY, coverSize / 2 + 2, 0, Math.PI * 2);
      ctx.strokeStyle = `${accent}${beatScale > 1.04 ? 'aa' : '44'}`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 中心装饰
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fillStyle = primary;
    ctx.fill();
  });

  return <canvas ref={canvasRef} className="pointer-events-none" />;
}
