'use client';

/**
 * FullBleedScene - 沉浸页"声景地平线"
 * 把中央类场景（频谱/波形）铺满视口宽度、贴住底边渲染，
 * 顶部渐隐遮罩让波形彻底融入黑暗背景，而非一个带边框的盒子。
 * 容器尺寸经 ResizeObserver 测量，canvas 按真实像素绘制。
 */
import { useEffect, useRef, useState } from 'react';
import { SpectrumVisualizer } from './SpectrumVisualizer';
import { WaveformVisualizer } from './WaveformVisualizer';

interface FullBleedSceneProps {
  type: 'spectrum' | 'waveform';
  /** 占视口高度比例（0-1） */
  heightRatio?: number;
  opacity?: number;
}

export function FullBleedScene({ type, heightRatio = 0.34, opacity = 0.7 }: FullBleedSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 bottom-0 pointer-events-none"
      style={{
        height: `${heightRatio * 100}vh`,
        opacity,
        maskImage: 'linear-gradient(to top, black 62%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to top, black 62%, transparent 100%)',
      }}
      aria-hidden
    >
      {size.w > 0 &&
        (type === 'spectrum' ? (
          <SpectrumVisualizer width={size.w} height={size.h} barCount={110} />
        ) : (
          <WaveformVisualizer width={size.w} height={size.h} />
        ))}
    </div>
  );
}
