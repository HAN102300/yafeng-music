'use client';

/**
 * 波形可视化组件（增强版）
 * 主波 + 粗辉光波 + 下方镜像波三层叠加；低频驱动整体振幅放大，节拍增亮提粗。
 * 订阅全局帧调度器直接绘制，组件 0 重渲染。
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
  // 低频驱动的振幅包络（平滑，防跳变）
  const ampRef = useRef(0.7);

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
    const { accent, primary } = colorsRef.current;

    // 振幅包络：低音越大波形越舒展（平滑跟随）
    const targetAmp = 0.55 + frame.bass * 0.75;
    ampRef.current += (targetAmp - ampRef.current) * 0.08;
    const amp = ampRef.current;

    // 节拍增亮
    const beat = frame.beat.isBeat;

    ctx.clearRect(0, 0, width, height);

    const { waveformData } = frame;
    const centerY = height / 2;
    const sliceWidth = width / waveformData.length;
    const drawWave = (
      strokeStyle: string,
      lineWidth: number,
      alpha: number,
      ampScale: number,
      yOffset: number
    ) => {
      ctx.beginPath();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = alpha;
      for (let i = 0; i < waveformData.length; i++) {
        const value = (waveformData[i] - 128) / 128;
        const y = centerY + yOffset + value * height * 0.42 * ampScale;
        const x = i * sliceWidth;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    // 1. 最外层辉光（主题主色，粗而淡）
    drawWave(primary, beat ? 14 : 11, 0.14, amp * 1.12, 0);
    // 2. 中层辉光（accent，中粗）
    drawWave(accent, 6, 0.3, amp * 1.05, 0);
    // 3. 主波（亮白核心，节拍时加粗）
    drawWave('#ffffff', beat ? 2.6 : 2, 0.95, amp, 0);
    // 4. 下方镜像波（渐隐反射，营造"悬浮在声场上"的感觉）
    drawWave(`${accent}88`, 1.6, 0.35, amp * 0.6, height * 0.34);

    // 中央填充（很淡，增加体积感）
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    for (let i = 0; i < waveformData.length; i++) {
      const value = (waveformData[i] - 128) / 128;
      const y = centerY + value * height * 0.42 * amp;
      const x = i * sliceWidth;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, centerY);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `${accent}30`);
    gradient.addColorStop(0.5, `${primary}0d`);
    gradient.addColorStop(1, `${accent}30`);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 中心基线（微弱）
    ctx.fillStyle = `${primary}33`;
    ctx.fillRect(0, centerY - 0.5, width, 1);
  });

  return <canvas ref={canvasRef} className="pointer-events-none" />;
}
