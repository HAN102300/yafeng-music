/**
 * 在线音源解析 + 播放地址缓存
 * 网易云播放 URL 约 20 分钟过期，按歌曲 id 缓存并留余量过期，
 * 过期后下次播放自动重新请求。
 */
import type { Track } from './data';
import type { SongQuality } from './server/netEase';
import { fetchSongUrl } from './api';

interface CachedUrl {
  url: string;
  expires: number;
}

const cache = new Map<number, CachedUrl>();
// 网易云 url 有效期约 1200s，留 100s 余量提前刷新
const URL_TTL_MS = 1100 * 1000;

export function isOnlineTrack(track: Track): boolean {
  return typeof track.neteaseId === 'number';
}

/** 解析一首歌的实际播放地址（本地歌直接返回本地路径） */
export async function resolveTrackSrc(track: Track, level: SongQuality = 'standard'): Promise<string> {
  if (!track.neteaseId) return track.audio;

  const id = track.neteaseId;
  const hit = cache.get(id);
  if (hit && Date.now() < hit.expires) return hit.url;

  const result = await fetchSongUrl(id, level);
  if (!result?.url) throw new Error('该歌曲暂无可用播放源');

  cache.set(id, { url: result.url, expires: Date.now() + URL_TTL_MS });
  return result.url;
}

/** 失效某首歌的播放地址缓存（播放失败/中途过期时调用，下次解析重新请求） */
export function invalidateTrack(id: number): void {
  cache.delete(id);
}

/** 清空全部地址缓存（音质切换后旧地址与新档位不符） */
export function clearUrlCache(): void {
  cache.clear();
}

/** 预取下一首在线歌的播放地址（供队列预加载） */
export async function prefetchTrack(track: Track, level: SongQuality = 'standard'): Promise<void> {
  try {
    await resolveTrackSrc(track, level);
  } catch {
    /* 预取失败静默忽略 */
  }
}
