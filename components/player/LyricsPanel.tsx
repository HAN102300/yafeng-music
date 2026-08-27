'use client';

/**
 * LyricsPanel - 歌词同步面板
 * 按全局播放时间（帧调度器 currentTime 通道）二分定位当前行；
 * 当前行以 BlurText 模糊渐入，前后行弱化显示。
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import BlurText from '@/components/ui/reactbits/BlurText';
import { parseLRC, findLyricIndex, LyricLine } from '@/lib/lyrics';
import { fetchLyricText } from '@/lib/api';
import { useAudioFrame } from '@/hooks/useAudioFrame';

interface LyricsPanelProps {
  lyricUrl?: string;
  neteaseId?: number;
  className?: string;
}

export function LyricsPanel({ lyricUrl, neteaseId, className = '' }: LyricsPanelProps) {
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [index, setIndex] = useState(-1);
  const indexRef = useRef(-1);
  const linesRef = useRef<LyricLine[]>([]);

  // 歌曲切换时加载歌词（本地 LRC / 在线歌词）
  useEffect(() => {
    setLines([]);
    setIndex(-1);
    indexRef.current = -1;
    linesRef.current = [];

    if (!lyricUrl && !neteaseId) return;
    let cancelled = false;

    const applyText = (text: string | null) => {
      if (cancelled || !text) return;
      const parsed = parseLRC(text);
      setLines(parsed);
      linesRef.current = parsed;
    };

    if (neteaseId) {
      fetchLyricText(neteaseId).then(applyText);
    } else if (lyricUrl) {
      fetch(lyricUrl)
        .then((r) => (r.ok ? r.text() : null))
        .then(applyText)
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [lyricUrl, neteaseId]);

  // 帧回调内定位当前行，仅行号变化时才 setState（低频）
  useAudioFrame((frame) => {
    if (linesRef.current.length === 0) return;
    const idx = findLyricIndex(linesRef.current, frame.currentTime);
    if (idx !== indexRef.current) {
      indexRef.current = idx;
      setIndex(idx);
    }
  });

  if (!lyricUrl || lines.length === 0) return null;

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
