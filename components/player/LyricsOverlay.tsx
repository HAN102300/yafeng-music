'use client';

/**
 * 全屏滚动歌词浮层（PlayerBar「歌词」按钮弹出）
 * 当前行放大发光、自动居中滚动、点击行 seek。
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useMusicStore } from '@/lib/store';
import { useLyrics } from '@/hooks/useLyrics';
import { useAudioFrame } from '@/hooks/useAudioFrame';
import { findLyricIndex } from '@/lib/lyrics';

interface LyricsOverlayProps {
  onClose: () => void;
}

export function LyricsOverlay({ onClose }: LyricsOverlayProps) {
  const currentSong = useMusicStore((s) => s.currentSong);
  const seekTo = useMusicStore((s) => s.seekTo);
  const lines = useLyrics(currentSong?.lyricUrl, currentSong?.neteaseId);

  const [index, setIndex] = useState(-1);
  const indexRef = useRef(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLButtonElement>(null);
  const autoScrollRef = useRef(true);

  // 帧回调定位当前行（低频 setState）
  useAudioFrame((frame) => {
    if (lines.length === 0) return;
    const idx = findLyricIndex(lines, frame.currentTime);
    if (idx !== indexRef.current) {
      indexRef.current = idx;
      setIndex(idx);
    }
  });

  // 当前行变化 → 自动居中滚动（用户手动滚动后 4s 内不打扰）
  useEffect(() => {
    if (!autoScrollRef.current) return;
    activeLineRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [index]);

  // 用户滚动检测
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const onWheel = () => {
      autoScrollRef.current = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        autoScrollRef.current = true;
      }, 4000);
    };
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchmove', onWheel, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchmove', onWheel);
      clearTimeout(timer);
    };
  }, []);

  if (!currentSong) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="fixed bottom-[92px] left-1/2 -translate-x-1/2 z-[60] w-[min(680px,92vw)] rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60"
      style={{
        background: 'rgba(12,12,29,0.92)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{currentSong.title}</p>
          <p className="text-xs text-white/40 truncate">{currentSong.artist}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          title="关闭歌词"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 滚动歌词 */}
      <div
        ref={containerRef}
        className="max-h-[46vh] overflow-y-auto px-6 py-6 space-y-3 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        {lines.length === 0 ? (
          <div className="text-center py-10 text-white/30 text-sm">
            ♪ 暂无歌词 ♪
          </div>
        ) : (
          lines.map((line, i) => {
            const active = i === index;
            return (
              <button
                key={`${line.time}-${i}`}
                ref={active ? activeLineRef : undefined}
                onClick={() => seekTo(line.time)}
                className={`block w-full text-left transition-all duration-300 rounded-xl px-3 py-1.5 ${
                  active
                    ? 'text-white text-lg md:text-xl font-semibold scale-[1.02]'
                    : 'text-white/35 hover:text-white/60 text-sm md:text-base'
                }`}
                style={
                  active
                    ? {
                        textShadow: '0 0 18px var(--glow-color, rgba(168,85,247,0.6))',
                      }
                    : undefined
                }
              >
                {line.text || '♪ ♪ ♪'}
              </button>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
