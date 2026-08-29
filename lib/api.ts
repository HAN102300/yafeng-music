/**
 * 前端音乐 API 客户端
 * 统一封装对服务端 Route Handler 的调用，隔离非官方接口细节。
 * - 统一超时（AbortSignal.timeout）
 * - 统一错误类型（网络故障 / 服务异常），与「空结果」严格区分
 */
import type { NetEaseSong, SongUrlResult } from '@/lib/server/netEase';
import type { Track } from '@/lib/data';

const REQUEST_TIMEOUT_MS = 10000;

/** API 调用错误：kind 区分网络故障与上游服务异常（UI 可给出不同文案） */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly kind: 'network' | 'server'
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** 统一 fetch：超时 + 错误归一化。附带网易云登录态（如已登录） */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const musicU = typeof window !== 'undefined' ? localStorage.getItem('yafeng-ncm-music-u') : null;
  if (musicU) headers.set('x-ncm-music-u', musicU);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new ApiError('网络连接失败或请求超时，请稍后重试', 'network');
  }
  if (!res.ok) {
    throw new ApiError(`服务异常（${res.status}），请稍后重试`, 'server');
  }
  return (await res.json()) as T;
}

export async function searchSongs(q: string, limit = 30): Promise<NetEaseSong[]> {
  if (!q.trim()) return [];
  const json = await apiFetch<{ songs?: NetEaseSong[] }>(
    `/api/search?q=${encodeURIComponent(q)}&limit=${limit}`
  );
  return json.songs ?? [];
}

/** 网易云搜索结果 → 本地 Track（在线歌） */
export function toTrack(s: NetEaseSong): Track {
  return {
    id: s.id,
    title: s.name,
    artist: s.artists,
    cover: s.cover,
    audio: '',
    neteaseId: s.id,
    duration: s.duration,
    fee: s.fee,
  };
}

export async function fetchSongUrl(id: number): Promise<SongUrlResult | null> {
  try {
    const json = await apiFetch<SongUrlResult & { error?: string }>(`/api/song-url?id=${id}`);
    return json.url ? json : null;
  } catch {
    // 取不到播放地址（VIP/版权限制是常态）对调用方表现为 null
    return null;
  }
}

export async function fetchLyricText(id: number): Promise<string | null> {
  try {
    const json = await apiFetch<{ lyric: string | null }>(`/api/lyric?id=${id}`);
    return json.lyric;
  } catch {
    return null;
  }
}
