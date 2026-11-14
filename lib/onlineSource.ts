/**
 * 在线音源解析 + 播放地址缓存
 * 网易云播放 URL 约 20 分钟过期，按歌曲 id 缓存并留余量过期，
 * 过期后下次播放自动重新请求。
 */
import type { Track } from './data';
import type { SongQuality } from './server/netEase';
import { fetchSongUrlWithInfo } from './api';

interface CachedUrl {
  url: string;
  expires: number;
  /** 版权标记：0/8 免费，1/4 VIP（仅试听） */
  fee: number;
}

const cache = new Map<number, CachedUrl>();
// 网易云 url 有效期约 1200s，留 100s 余量提前刷新
const URL_TTL_MS = 1100 * 1000;

export function isOnlineTrack(track: Track): boolean {
  return typeof track.neteaseId === 'number';
}

/** 带完整信息（含版权 fee）解析播放地址；缓存命中时 fee 取缓存值 */
export async function resolveTrackSrcWithInfo(
  track: Track,
  level: SongQuality = 'standard'
): Promise<{ url: string; fee: number }> {
  if (!track.neteaseId) return { url: track.audio, fee: track.fee ?? 0 };

  const id = track.neteaseId;
  const hit = cache.get(id);
  if (hit && Date.now() < hit.expires) return { url: hit.url, fee: hit.fee };

  const result = await fetchSongUrlWithInfo(id, level);
  if (!result?.url) throw new Error(failHint(result?.fee ?? track.fee));

  cache.set(id, { url: result.url, expires: Date.now() + URL_TTL_MS, fee: result.fee });
  return { url: result.url, fee: result.fee };
}

export async function resolveTrackSrc(track: Track, level: SongQuality = 'standard'): Promise<string> {
  return (await resolveTrackSrcWithInfo(track, level)).url;
}

/** 解析失败的提示语：区分 VIP / 版权下架 / 网络异常 */
export function failHint(fee?: number): string {
  if (fee === 1 || fee === 4) return '该歌曲为 VIP 专属，需要网易云音乐 VIP 账号登录';
  return '该歌曲暂无可用播放源（可能因版权下架）';
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
