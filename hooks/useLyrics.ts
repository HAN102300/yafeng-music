'use client';

/**
 * 歌词加载 Hook：拉取并解析网易云 LRC 歌词
 */
import { useEffect, useState } from 'react';
import { parseLRC, type LyricLine } from '@/lib/lyrics';
import { fetchLyricText } from '@/lib/api';

export function useLyrics(neteaseId?: number): LyricLine[] {
  const [lines, setLines] = useState<LyricLine[]>([]);

  useEffect(() => {
    setLines([]);
    if (!neteaseId) return;
    let cancelled = false;

    fetchLyricText(neteaseId).then((text) => {
      if (cancelled || !text) return;
      setLines(parseLRC(text));
    });

    return () => {
      cancelled = true;
    };
  }, [neteaseId]);

  return lines;
}
