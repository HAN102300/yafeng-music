/**
 * 展示格式化工具
 */

/** 毫秒 → m:ss */
export function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '--:--';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 秒 → m:ss（音频元素时长） */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** 播放次数 → 12.3亿 / 345.6万 / 8901 */
export function formatPlayCount(n: number): string {
  if (!n || n <= 0) return '0';
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}
