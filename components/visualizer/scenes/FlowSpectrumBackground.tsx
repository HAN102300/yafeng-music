'use client';

/**
 * 流光频谱背景（light 全屏场景，Canvas 2D）
 * 底部流动频谱光带 + 低音呼吸辉光 + 节拍提亮。
 * 零 WebGL 依赖，低配设备可用；条形高度 lerp 插值保证丝滑。
 */
import { useEffect, useRef } from 'react';
import { useAudioFrame } from '@/hooks/useAudioFrame';

const BAR_COUNT = 72;
const PRIMARY_REFRESH_FRAMES = 60;

export function FlowSpectrumBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const primaryRef = useRef('#a855f7');
  const frameCountRef = useRef(0);
  const beatGlowRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w: canvas.clientWidth, h: canvas.clientHeight, dpr };
      canvas.width = Math.max(1, canvas.clientWidth * dpr);
      canvas.height = Math.max(1, canvas.clientHeight * dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useAudioFrame((frame) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h, dpr } = sizeRef.current;
    if (w === 0 || h === 0) return;

    // 主色低频刷新（跟随主题引擎的音频自适应变色）
    frameCountRef.current++;
    if (frameCountRef.current % PRIMARY_REFRESH_FRAMES === 1) {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
      if (v) primaryRef.current = v;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // ---- 低音呼吸辉光 ----
    beatGlowRef.current = frame.beat.isBeat ? 1 : beatGlowRef.current * 0.94;
    const glowAlpha = 0.06 + frame.bass * 0.14 + beatGlowRef.current * 0.05;
    const glow = ctx.createRadialGradient(w / 2, h * 1.1, 0, w / 2, h * 1.1, Math.max(w, h) * 0.7);
    glow.addColorStop(0, hexA(primaryRef.current, glowAlpha));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // ---- 底部频谱光带（lerp 平滑） ----
    const freq = frame.frequencyData;
    const binPerBar = freq.length / BAR_COUNT;
    const bars = barsRef.current;
    const maxH = h * 0.42;
    const barW = w / BAR_COUNT;

    for (let i = 0; i < BAR_COUNT; i++) {
      // 分桶取最大值，低频段加权
      let v = 0;
      const start = Math.floor(i * binPerBar);
      const end = Math.floor((i + 1) * binPerBar);
      for (let j = start; j < Math.max(start + 1, end); j++) v = Math.max(v, freq[j] ?? 0);
      const target = (v / 255) ** 1.4;
      bars[i] += (target - bars[i]) * 0.25; // 丝滑插值

      const barH = bars[i] * maxH;
      if (barH < 1) continue;

      const x = i * barW;
      const grad = ctx.createLinearGradient(0, h, 0, h - barH);
      grad.addColorStop(0, hexA(primaryRef.current, 0.34));
      grad.addColorStop(0.6, hexA(primaryRef.current, 0.16));
      grad.addColorStop(1, hexA(primaryRef.current, 0.02));
      ctx.fillStyle = grad;

      // 圆角条形
      const r = Math.min(barW * 0.32, 6);
      roundRect(ctx, x + barW * 0.18, h - barH, barW * 0.64, barH, r);
      ctx.fill();
    }

    // ---- 顶缘光线（能量越高越亮） ----
    const lineGrad = ctx.createLinearGradient(0, 0, w, 0);
    lineGrad.addColorStop(0, hexA(primaryRef.current, 0));
    lineGrad.addColorStop(0.5, hexA(primaryRef.current, 0.05 + frame.energy * 0.2));
    lineGrad.addColorStop(1, hexA(primaryRef.current, 0));
    ctx.fillStyle = lineGrad;
    ctx.fillRect(0, 0, w, 2);
  });

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

/** '#rrggbb' + alpha → rgba()；非标准输入回退紫色 */
function hexA(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(168,85,247,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
