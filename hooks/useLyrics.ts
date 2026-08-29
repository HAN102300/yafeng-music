'use client';

/**
 * 歌词加载 Hook：本地 LRC / 网易云在线歌词统一获取与解析
 */
import { useEffect, useState } from 'react';
import { parseLRC, type LyricLine } from '@/lib/lyrics';
import { fetchLyricText } from '@/lib/api';

export function useLyrics(lyricUrl?: string, neteaseId?: number): LyricLine[] {
  const [lines, setLines] = useState<LyricLine[]>([]);

  useEffect(() => {
    setLines([]);
    if (!lyricUrl && !neteaseId) return;
    let cancelled = false;

    const applyText = (text: string | null) => {
      if (cancelled || !text) return;
      setLines(parseLRC(text));
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

  return lines;
}
