'use client';

/**
 * 流光频谱背景（light 全屏场景，Canvas 2D）——增强版
 * 底部流动频谱光带（更高更亮）+ 低音冲击波扩散圆环 + 上浮光尘 + 低音呼吸辉光。
 * 零 WebGL 依赖，低配设备可用；条形高度 lerp 插值保证丝滑。
 */
import { useEffect, useRef } from 'react';
import { useAudioFrame } from '@/hooks/useAudioFrame';

const BAR_COUNT = 84;
const PRIMARY_REFRESH_FRAMES = 60;
const MAX_SHOCKWAVES = 5;
const DUST_COUNT = 42;

interface Shockwave {
  r: number;
  alpha: number;
}

interface Dust {
  x: number; // 0-1 相对位置
  y: number; // 0-1 相对位置（1 = 底部）
  speed: number;
  size: number;
}

export function FlowSpectrumBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const primaryRef = useRef('#a855f7');
  const accentRef = useRef('#22d3ee');
  const frameCountRef = useRef(0);
  const beatGlowRef = useRef(0);
  const shockRef = useRef<Shockwave[]>([]);
  const dustRef = useRef<Dust[]>([]);

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

    // 主题色低频刷新（跟随主题引擎的音频自适应变色）
    frameCountRef.current++;
    if (frameCountRef.current % PRIMARY_REFRESH_FRAMES === 1) {
      const cs = getComputedStyle(document.documentElement);
      const p = cs.getPropertyValue('--color-primary').trim();
      const a = cs.getPropertyValue('--color-accent').trim();
      if (p) primaryRef.current = p;
      if (a) accentRef.current = a;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // ---- 低音呼吸辉光（更高更亮） ----
    beatGlowRef.current = frame.beat.isBeat ? 1 : beatGlowRef.current * 0.94;
    const glowAlpha = 0.08 + frame.bass * 0.2 + beatGlowRef.current * 0.06;
    const glow = ctx.createRadialGradient(w / 2, h * 1.05, 0, w / 2, h * 1.05, Math.max(w, h) * 0.75);
    glow.addColorStop(0, hexA(primaryRef.current, glowAlpha));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // ---- 节拍冲击波：从底部中心扩散的圆环 ----
    if (frame.beat.isBeat && shockRef.current.length < MAX_SHOCKWAVES) {
      shockRef.current.push({ r: 20, alpha: 0.5 });
    }
    shockRef.current = shockRef.current.filter((s) => s.alpha > 0.01);
    for (const s of shockRef.current) {
      s.r += (w / 60) * (1 + frame.bass);
      s.alpha *= 0.955;
      ctx.beginPath();
      ctx.ellipse(w / 2, h, s.r, s.r * 0.42, 0, 0, Math.PI * 2);
      ctx.strokeStyle = hexA(accentRef.current, s.alpha * 0.5);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ---- 上浮光尘（beat 时加速） ----
    if (dustRef.current.length === 0) {
      dustRef.current = Array.from({ length: DUST_COUNT }, () => ({
        x: Math.random(),
        y: 1 + Math.random() * 0.2,
        speed: 0.0006 + Math.random() * 0.0012,
        size: 1 + Math.random() * 1.8,
      }));
    }
    const dustBoost = 1 + frame.energy * 2 + beatGlowRef.current;
    for (const d of dustRef.current) {
      d.y -= d.speed * dustBoost;
      if (d.y < -0.05) {
        d.y = 1.05;
        d.x = Math.random();
      }
      ctx.beginPath();
      ctx.arc(d.x * w, d.y * h, d.size, 0, Math.PI * 2);
      ctx.fillStyle = hexA(accentRef.current, 0.14 + frame.energy * 0.3);
      ctx.fill();
    }

    // ---- 底部频谱光带（更高更亮 + lerp 平滑） ----
    const freq = frame.frequencyData;
    const binPerBar = freq.length / BAR_COUNT;
    const bars = barsRef.current;
    const maxH = h * 0.52; // 更高
    const barW = w / BAR_COUNT;

    for (let i = 0; i < BAR_COUNT; i++) {
      let v = 0;
      const start = Math.floor(i * binPerBar);
      const end = Math.floor((i + 1) * binPerBar);
      for (let j = start; j < Math.max(start + 1, end); j++) v = Math.max(v, freq[j] ?? 0);
      const target = (v / 255) ** 1.32;
      bars[i] += (target - bars[i]) * 0.28;

      const barH = bars[i] * maxH;
      if (barH < 1) continue;

      const x = i * barW;
      const grad = ctx.createLinearGradient(0, h, 0, h - barH);
      grad.addColorStop(0, hexA(primaryRef.current, 0.5));
      grad.addColorStop(0.55, hexA(primaryRef.current, 0.24));
      grad.addColorStop(1, hexA(accentRef.current, 0.05));
      ctx.fillStyle = grad;

      const r = Math.min(barW * 0.32, 6);
      roundRect(ctx, x + barW * 0.18, h - barH, barW * 0.64, barH, r);
      ctx.fill();

      // 柱顶光点（能量高时更亮）
      if (bars[i] > 0.5) {
        ctx.beginPath();
        ctx.arc(x + barW / 2, h - barH, Math.max(1, barW * 0.14), 0, Math.PI * 2);
        ctx.fillStyle = hexA(accentRef.current, 0.35);
        ctx.fill();
      }
    }

    // ---- 顶缘光线（能量越高越亮） ----
    const lineGrad = ctx.createLinearGradient(0, 0, w, 0);
    lineGrad.addColorStop(0, hexA(primaryRef.current, 0));
    lineGrad.addColorStop(0.5, hexA(primaryRef.current, 0.06 + frame.energy * 0.24));
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
  const hh = Math.max(h, 0.01);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + hh, r);
  ctx.arcTo(x + w, y + hh, x, y + hh, r);
  ctx.arcTo(x, y + hh, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
