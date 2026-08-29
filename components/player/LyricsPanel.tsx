'use client';

/**
 * LyricsPanel - 歌词同步面板
 * 按全局播放时间（帧调度器 currentTime 通道）二分定位当前行；
 * 当前行以 BlurText 模糊渐入，前后行弱化显示。
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import BlurText from '@/components/ui/reactbits/BlurText';
import { findLyricIndex } from '@/lib/lyrics';
import { useLyrics } from '@/hooks/useLyrics';
import { useAudioFrame } from '@/hooks/useAudioFrame';

interface LyricsPanelProps {
  lyricUrl?: string;
  neteaseId?: number;
  className?: string;
}

export function LyricsPanel({ lyricUrl, neteaseId, className = '' }: LyricsPanelProps) {
  const lines = useLyrics(lyricUrl, neteaseId);
  const [index, setIndex] = useState(-1);
  const indexRef = useRef(-1);
  const linesRef = useRef<typeof lines>([]);

  // 同步最新歌词到 ref（帧回调内读取，避免闭包过期）；歌曲切换时重置行号
  useEffect(() => {
    linesRef.current = lines;
    indexRef.current = -1;
    setIndex(-1);
  }, [lines]);

  // 帧回调内定位当前行，仅行号变化时才 setState（低频）
  useAudioFrame((frame) => {
    if (linesRef.current.length === 0) return;
    const idx = findLyricIndex(linesRef.current, frame.currentTime);
    if (idx !== indexRef.current) {
      indexRef.current = idx;
      setIndex(idx);
    }
  });

  if ((!lyricUrl && !neteaseId) || lines.length === 0) return null;

  const prevText = index > 0 ? lines[index - 1].text : '';
  const currentText = index >= 0 ? lines[index].text : '';
  const nextText = index + 1 < lines.length ? lines[index + 1].text : '';

  return (
    <div className={`flex flex-col items-center gap-2 text-center select-none ${className}`}>
      <p className="text-sm text-white/30 truncate max-w-md h-5">{prevText}</p>
      {currentText ? (
        <BlurText
          key={index}
          text={currentText}
          delay={40}
          stepDuration={0.2}
          animateBy="letters"
          className="justify-center text-xl md:text-2xl font-semibold text-white drop-shadow-lg"
        />
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          className="text-xl text-white/50 h-8"
        >
          ♪ ♪ ♪
        </motion.p>
      )}
      <p className="text-sm text-white/30 truncate max-w-md h-5">{nextText}</p>
    </div>
  );
}
