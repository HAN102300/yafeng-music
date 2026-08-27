/**
 * 前端音乐 API 客户端
 * 统一封装对服务端 Route Handler 的调用，隔离非官方接口细节。
 */
import type { NetEaseSong, SongUrlResult } from '@/lib/server/netEase';
import type { Track } from '@/lib/data';

export async function searchSongs(q: string, limit = 30): Promise<NetEaseSong[]> {
  if (!q.trim()) return [];
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  if (!res.ok) return [];
  const json = (await res.json()) as { songs?: NetEaseSong[] };
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
  const res = await fetch(`/api/song-url?id=${id}`);
  if (!res.ok) return null;
  const json = (await res.json()) as SongUrlResult & { error?: string };
  return json.url ? json : null;
}

export async function fetchLyricText(id: number): Promise<string | null> {
  const res = await fetch(`/api/lyric?id=${id}`);
  if (!res.ok) return null;
  const json = (await res.json()) as { lyric: string | null };
  return json.lyric;
}
