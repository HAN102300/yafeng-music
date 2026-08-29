/**
 * 前端音乐 API 客户端
 * 统一封装对服务端 Route Handler 的调用，隔离非官方接口细节。
 * - 统一超时（AbortSignal.timeout）
 * - 统一错误类型（网络故障 / 服务异常），与「空结果」严格区分
 * - 自动附带网易云登录态（MUSIC_U 透传头）
 */
import type {
  NetEaseSong,
  NetEasePlaylist,
  NetEaseArtist,
  NetEaseToplist,
  SongUrlResult,
  SongQuality,
  QrCheckResult,
} from '@/lib/server/netEase';
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

// ---------- 基础映射 ----------

/** 网易云歌曲 → 本地 Track（在线歌） */
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

// ---------- 搜索 ----------

export type SearchType = 'song' | 'artist' | 'playlist';

export async function searchSongs(q: string, limit = 30): Promise<NetEaseSong[]> {
  if (!q.trim()) return [];
  const json = await apiFetch<{ songs?: NetEaseSong[] }>(
    `/api/search?q=${encodeURIComponent(q)}&limit=${limit}&type=song`
  );
  return json.songs ?? [];
}

export async function searchArtists(q: string, limit = 20): Promise<NetEaseArtist[]> {
  if (!q.trim()) return [];
  const json = await apiFetch<{ artists?: NetEaseArtist[] }>(
    `/api/search?q=${encodeURIComponent(q)}&limit=${limit}&type=artist`
  );
  return json.artists ?? [];
}

export async function searchPlaylists(q: string, limit = 20): Promise<NetEasePlaylist[]> {
  if (!q.trim()) return [];
  const json = await apiFetch<{ playlists?: NetEasePlaylist[] }>(
    `/api/search?q=${encodeURIComponent(q)}&limit=${limit}&type=playlist`
  );
  return json.playlists ?? [];
}

export async function fetchSearchHot(): Promise<string[]> {
  const json = await apiFetch<{ keywords?: string[] }>('/api/search-hot');
  return json.keywords ?? [];
}

// ---------- 榜单 ----------

export async function fetchToplists(): Promise<NetEaseToplist[]> {
  const json = await apiFetch<{ toplists?: NetEaseToplist[] }>('/api/toplist');
  return json.toplists ?? [];
}

// ---------- 歌单 ----------

export interface PlaylistDetail {
  playlist: NetEasePlaylist;
  songs: NetEaseSong[];
  total: number;
}

export async function fetchPlaylistDetail(
  id: number,
  limit = 100,
  offset = 0
): Promise<PlaylistDetail> {
  return apiFetch<PlaylistDetail>(`/api/playlist?id=${id}&limit=${limit}&offset=${offset}`);
}

export async function fetchHotPlaylists(
  cat = '全部',
  limit = 35,
  offset = 0,
  highquality = false
): Promise<{ playlists: NetEasePlaylist[]; more: boolean }> {
  return apiFetch(
    `/api/playlist-hot?cat=${encodeURIComponent(cat)}&limit=${limit}&offset=${offset}&high=${highquality ? 1 : 0}`
  );
}

export async function fetchPlaylistCatalogue(): Promise<{ name: string; hot: boolean }[]> {
  const json = await apiFetch<{ categories?: { name: string; hot: boolean }[] }>(
    '/api/playlist-catalogue'
  );
  return json.categories ?? [];
}

// ---------- 歌手 ----------

export async function fetchArtist(id: number): Promise<{
  artist: NetEaseArtist;
  songs: NetEaseSong[];
}> {
  return apiFetch(`/api/artist?id=${id}`);
}

export async function fetchHotArtists(limit = 30, offset = 0): Promise<NetEaseArtist[]> {
  const json = await apiFetch<{ artists?: NetEaseArtist[] }>(
    `/api/artist-hot?limit=${limit}&offset=${offset}`
  );
  return json.artists ?? [];
}

// ---------- 推荐（免登录） ----------

export async function fetchPersonalized(limit = 10): Promise<NetEasePlaylist[]> {
  const json = await apiFetch<{ playlists?: NetEasePlaylist[] }>(`/api/personalized?limit=${limit}`);
  return json.playlists ?? [];
}

export async function fetchNewSongs(limit = 12): Promise<NetEaseSong[]> {
  const json = await apiFetch<{ songs?: NetEaseSong[] }>(`/api/newsong?limit=${limit}`);
  return json.songs ?? [];
}

// ---------- 登录态 ----------

export async function createQrKey(): Promise<string> {
  const json = await apiFetch<{ unikey?: string }>('/api/auth/qr-key');
  if (!json.unikey) throw new ApiError('二维码生成失败，请重试', 'server');
  return json.unikey;
}

export async function checkQrKey(key: string): Promise<QrCheckResult> {
  return apiFetch<QrCheckResult>(`/api/auth/qr-check?key=${encodeURIComponent(key)}`);
}

export interface NcmAccount {
  userId: number;
  nickname: string;
  avatarUrl: string;
}

export async function fetchAccount(): Promise<NcmAccount | null> {
  const json = await apiFetch<{ account?: NcmAccount | null }>('/api/account');
  return json.account ?? null;
}

export async function fetchDailyRecommend(): Promise<NetEaseSong[]> {
  const json = await apiFetch<{ songs?: NetEaseSong[] }>('/api/recommend-songs');
  return json.songs ?? [];
}

export async function fetchPersonalFM(): Promise<NetEaseSong[]> {
  const json = await apiFetch<{ songs?: NetEaseSong[] }>('/api/personal-fm');
  return json.songs ?? [];
}

export async function fetchUserPlaylists(uid: number): Promise<NetEasePlaylist[]> {
  const json = await apiFetch<{ playlists?: NetEasePlaylist[] }>(`/api/user-playlists?uid=${uid}`);
  return json.playlists ?? [];
}

// ---------- 播放地址 / 歌词 ----------

export async function fetchSongUrl(id: number, level: SongQuality = 'standard'): Promise<SongUrlResult | null> {
  try {
    const json = await apiFetch<SongUrlResult & { error?: string }>(
      `/api/song-url?id=${id}&level=${level}`
    );
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
