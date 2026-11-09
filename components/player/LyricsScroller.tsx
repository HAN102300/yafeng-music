'use client';

/**
 * LyricsScroller - 沉浸页内嵌滚动歌词
 * 当前行居中放大发光、整体平滑位移、上下渐隐遮罩、点击行 seek。
 * 与 LyricsOverlay 同源逻辑，但作为页面内的一个区块渲染（无浮层边框）。
 */
import { useEffect, useRef, useState } from 'react';
import { useMusicStore } from '@/lib/store';
import { useLyrics } from '@/hooks/useLyrics';
import { useAudioFrame } from '@/hooks/useAudioFrame';
import { findLyricIndex } from '@/lib/lyrics';

interface LyricsScrollerProps {
  neteaseId?: number;
  /** 容器高度（px）；不传则由外部 className/flex 决定 */
  height?: number;
  /** 单行高度（px） */
  lineHeight?: number;
  className?: string;
}

export function LyricsScroller({
  neteaseId,
  height,
  lineHeight = 44,
  className = '',
}: LyricsScrollerProps) {
  const seekTo = useMusicStore((s) => s.seekTo);
  const lines = useLyrics(neteaseId);

  const [index, setIndex] = useState(-1);
  const indexRef = useRef(-1);
  // 容器实测高度（flex 布局下 height prop 可能为空，居中偏移必须用真实高度）
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxH, setBoxH] = useState(height ?? 220);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h && Math.abs(h - boxH) > 1) setBoxH(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [boxH]);

  useAudioFrame((frame) => {
    if (lines.length === 0) return;
    const idx = findLyricIndex(lines, frame.currentTime);
    if (idx !== indexRef.current) {
      indexRef.current = idx;
      setIndex(idx);
    }
  });

  if (lines.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-white/25 text-sm select-none ${className}`}
        style={{ height: height ?? undefined, minHeight: 96 }}
      >
        ♪ 暂无歌词 ♪
      </div>
    );
  }

  // 当前行保持居中（无活跃行时显示开头）
  const offset = index < 0 ? 0 : boxH / 2 - (index + 0.5) * lineHeight;

  return (
    <div
      ref={boxRef}
      className={`relative overflow-hidden select-none ${className}`}
      style={{ height: height ?? undefined, minHeight: 96 }}
    >
      <div
        style={{
          transform: `translateY(${offset}px)`,
          transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {lines.map((line, i) => {
          const active = i === index;
          return (
            <button
              key={`${line.time}-${i}`}
              onClick={() => seekTo(line.time)}
              className={`block w-full text-center mx-auto transition-all duration-300 rounded-xl px-4 ${
                active
                  ? 'text-white text-2xl md:text-3xl font-bold scale-105'
                  : 'text-white/30 hover:text-white/60 text-sm md:text-base'
              }`}
              style={{
                height: lineHeight,
                transition: 'font-size 0.25s ease, color 0.25s ease, transform 0.25s ease',
                textShadow: active ? '0 0 24px var(--glow-color, rgba(168,85,247,0.7))' : undefined,
              }}
            >
              {line.text || '♪ ♪ ♪'}
            </button>
          );
        })}
      </div>
      {/* 上下渐隐遮罩 */}
      <div
        className="absolute inset-x-0 top-0 h-12 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, var(--color-dark-base), transparent)' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--color-dark-base), transparent)' }}
      />
    </div>
  );
}
