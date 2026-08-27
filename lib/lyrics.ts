/**
 * LRC 歌词解析与按时间查行
 */

export interface LyricLine {
  time: number; // 秒
  text: string;
}

/**
 * 解析 LRC 文本 → 按时间升序的歌词行
 * 支持 [mm:ss.xx] / [mm:ss] 标签，同行多标签
 */
export function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const tagRegex = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

  for (const raw of lrc.split(/\r?\n/)) {
    const text = raw.replace(tagRegex, '').trim();
    tagRegex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(raw)) !== null) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const fracRaw = match[3] ?? '0';
      const frac = parseInt(fracRaw, 10) / Math.pow(10, fracRaw.length);
      lines.push({ time: mins * 60 + secs + frac, text });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

/**
 * 二分查找当前时间对应的歌词行下标（-1 表示未开始）
 */
export function findLyricIndex(lines: LyricLine[], currentTime: number): number {
  if (lines.length === 0 || currentTime < lines[0].time) return -1;

  let lo = 0;
  let hi = lines.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (lines[mid].time <= currentTime) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

/** 拉取并解析 LRC 文件 */
export async function fetchLyrics(url: string): Promise<LyricLine[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return parseLRC(await res.text());
  } catch {
    return [];
  }
}
