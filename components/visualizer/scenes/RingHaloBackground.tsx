'use client';

/**
 * RingHaloBackground - 环形音浪的全屏背景层
 *
 * 以视口中心为圆心的三层同心环形频谱，向外辐射并随低频整体呼吸，
 * 逐层降低透明度与柱长形成纵深；旋转角速度随能量加速。
 * 暂停/静默时由伪频谱行波兜底，背景不会冻死。
 *
 * 绘制按环聚合为单条 Path2D 后一次性 stroke（3 次 draw call），
 * 而非逐根柱 stroke。
 */
import { useEffect, useRef } from 'react';
import { useAudioFrame } from '@/hooks/useAudioFrame';
import { readThemeColors, type SceneThemeColors } from '@/lib/visualizer/themeColors';
import { isIdleFrame, idleSpectrumAt } from '@/lib/visualizer/idleMotion';

interface RingSpec {
  /** 环半径占 min(视口宽, 高) 的比例 */
  radiusRatio: number;
  barCount: number;
  /** 柱长上限占 min(视口宽, 高) 的比例 */
  reachRatio: number;
  alpha: number;
  /** 每帧基础旋转弧度（正负决定转向） */
  spin: number;
  lineWidthRatio: number;
}

/**
 * 半径整体外推：沉浸页中央封面圆环半径约 135px，最内环需明显超出它，
 * 否则两圈近乎同心却不同心，读起来像错位而非环绕。
 */
const RINGS: RingSpec[] = [
  { radiusRatio: 0.34, barCount: 128, reachRatio: 0.085, alpha: 0.5, spin: 0.0016, lineWidthRatio: 0.004 },
  { radiusRatio: 0.47, barCount: 96, reachRatio: 0.062, alpha: 0.28, spin: -0.0011, lineWidthRatio: 0.003 },
  { radiusRatio: 0.62, barCount: 72, reachRatio: 0.045, alpha: 0.15, spin: 0.0007, lineWidthRatio: 0.0024 },
];

export function RingHaloBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorsRef = useRef<SceneThemeColors>(readThemeColors());
  const tickRef = useRef(0);
  const rotRef = useRef<number[]>(RINGS.map(() => 0));
  const smoothRef = useRef<Float32Array[]>(RINGS.map((r) => new Float32Array(r.barCount)));
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      sizeRef.current = { w, h };
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useAudioFrame((frame) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;

    // 主题色低频刷新（CSS 变量由播放引擎节流写入，无需每帧 getComputedStyle）
    if (tickRef.current++ % 30 === 0) colorsRef.current = readThemeColors();
    const { primary, accent, glow } = colorsRef.current;

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const base = Math.min(w, h);
    const idle = isIdleFrame(frame);
    const t = performance.now() / 1000;
    const bassPulse = 1 + frame.bass * 0.1;
    const { frequencyData } = frame;
    const bins = frequencyData.length;

    ctx.lineCap = 'round';

    RINGS.forEach((ring, ri) => {
      const r0 = base * ring.radiusRatio * bassPulse;
      rotRef.current[ri] += ring.spin * (1 + frame.energy * 2.5);
      const rot = rotRef.current[ri];
      const smooth = smoothRef.current[ri];
      const reach = base * ring.reachRatio;

      // 高频段用幂次压缩，让低频占据更多柱位，观感更接近真实频谱分布
      const path = new Path2D();
      for (let i = 0; i < ring.barCount; i++) {
        const x = i / ring.barCount;
        const bin = Math.min(bins - 1, Math.floor(Math.pow(x, 1.6) * (bins - 1)));
        const raw = idle ? idleSpectrumAt(x, t) : frequencyData[bin] / 255;
        const prev = smooth[i];
        smooth[i] = raw > prev ? prev + (raw - prev) * 0.45 : prev + (raw - prev) * 0.12;

        const angle = x * Math.PI * 2 + rot;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const len = smooth[i] * reach;
        path.moveTo(cx + cos * r0, cy + sin * r0);
        path.lineTo(cx + cos * (r0 + len), cy + sin * (r0 + len));
      }

      ctx.globalAlpha = ring.alpha;
      ctx.strokeStyle = ri === 0 ? accent : primary;
      ctx.lineWidth = Math.max(1, base * ring.lineWidthRatio);
      ctx.stroke(path);

      // 环本体细描边，撑起同心结构
      ctx.globalAlpha = ring.alpha * 0.45;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r0, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 中心辉光随能量呼吸
    const glowR = base * (0.2 + frame.energy * 0.14);
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    gradient.addColorStop(0, glow);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);
    ctx.globalAlpha = 1;
  });

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}
