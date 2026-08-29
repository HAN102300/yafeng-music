'use client';

/**
 * 搜索页（API 化重构版）
 * 单曲 / 歌手 / 歌单三类型搜索 + 热搜词 + 搜索历史（localStorage）。
 * 网络故障与「无结果」严格区分。
 */
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { searchSongs, searchArtists, searchPlaylists, fetchSearchHot, toTrack, ApiError } from '@/lib/api';
import type { NetEaseSong, NetEaseArtist, NetEasePlaylist } from '@/lib/server/netEase';
import { Sparkles } from '@/components/ui/aceternity/sparkles';
import ShinyText from '@/components/ui/reactbits/ShinyText';
import { TrackList } from '@/components/ui/TrackList';
import { ArtistCard } from '@/components/cards/ArtistCard';
import { PlaylistCard } from '@/components/cards/PlaylistCard';
import { LoadingBlock } from '@/components/ui/StateViews';

type SearchType = 'song' | 'artist' | 'playlist';
const HISTORY_KEY = 'yafeng-search-history';
const TYPE_TABS: { id: SearchType; label: string; icon: string }[] = [
  { id: 'song', label: '单曲', icon: '🎵' },
  { id: 'artist', label: '歌手', icon: '🎤' },
  { id: 'playlist', label: '歌单', icon: '📋' },
];

function getHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function pushHistory(q: string): string[] {
  const list = [q, ...getHistory().filter((h) => h !== q)].slice(0, 10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  return list;
}

function SearchContent() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get('q') ?? '';

  const [keyword, setKeyword] = useState(initial);
  const [type, setType] = useState<SearchType>('song');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [songs, setSongs] = useState<NetEaseSong[]>([]);
  const [artists, setArtists] = useState<NetEaseArtist[]>([]);
  const [playlists, setPlaylists] = useState<NetEasePlaylist[]>([]);

  const [hotWords, setHotWords] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setHistory(getHistory());
    fetchSearchHot()
      .then(setHotWords)
      .catch(() => {});
  }, []);

  const doSearch = useCallback(
    async (q: string, searchType: SearchType) => {
      if (!q.trim()) return;
      setLoading(true);
      setSearched(true);
      setError(null);
      try {
        if (searchType === 'song') setSongs(await searchSongs(q, 30));
        else if (searchType === 'artist') setArtists(await searchArtists(q, 18));
        else setPlaylists(await searchPlaylists(q, 18));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : '搜索失败');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (initial) {
      setKeyword(initial);
      setHistory(pushHistory(initial));
      doSearch(initial, type);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在 URL 关键词变化时搜索
  }, [initial]);

  useEffect(() => {
    // 切换类型时对当前关键词重查
    if (searched && keyword.trim()) doSearch(keyword.trim(), type);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在类型切换时重查
  }, [type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    if (!q) return;
    router.replace(`/search?q=${encodeURIComponent(q)}`);
    setHistory(pushHistory(q));
    doSearch(q, type);
  };

  const handleKeyword = (q: string) => {
    setKeyword(q);
    setHistory(pushHistory(q));
    router.replace(`/search?q=${encodeURIComponent(q)}`);
    doSearch(q, type);
  };

  const resultCount = type === 'song' ? songs.length : type === 'artist' ? artists.length : playlists.length;

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 relative">
      <Sparkles density={20} color="#00d9f5" className="opacity-15" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* 标题 */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <ShinyText text="搜索音乐" speed={3} className="text-3xl md:text-4xl font-bold" shineColor="#a5f3fc" color="#22d3ee" />
          <p className="text-white/40 mt-1 text-sm">全库搜索 · 单曲 / 歌手 / 歌单</p>
        </motion.div>

        {/* 搜索框 */}
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onSubmit={handleSubmit}
          className="mb-5"
        >
          <div className="glass-panel px-5 py-4 flex items-center gap-3 focus-within:border-white/25 transition-colors">
            <svg className="w-5 h-5 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索歌曲、歌手、歌单..."
              autoFocus
              className="bg-transparent text-base text-white placeholder-white/40 w-full outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-sm font-medium bg-gradient-primary text-white hover:opacity-90 transition-opacity flex-shrink-0"
            >
              搜索
            </button>
          </div>
        </motion.form>

        {/* 类型 tabs */}
        <div className="flex justify-center gap-2 mb-6">
          {TYPE_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                type === t.id
                  ? 'bg-white/10 text-cyan-300 border-cyan-500/40'
                  : 'text-white/50 hover:text-white border-transparent hover:bg-white/5'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* 热搜词 + 搜索历史 */}
        {!searched && (
          <div className="space-y-5 mb-8">
            {history.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-white/40">搜索历史</p>
                  <button
                    onClick={() => {
                      localStorage.removeItem(HISTORY_KEY);
                      setHistory([]);
                    }}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    清空
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((h) => (
                    <button
                      key={h}
                      onClick={() => handleKeyword(h)}
                      className="px-3 py-1.5 rounded-full text-xs glass-panel text-white/60 hover:text-white transition-colors"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {hotWords.length > 0 && (
              <div>
                <p className="text-xs text-white/40 mb-2">🔥 热搜榜</p>
                <div className="flex flex-wrap gap-2">
                  {hotWords.map((w, i) => (
                    <button
                      key={w}
                      onClick={() => handleKeyword(w)}
                      className="px-3 py-1.5 rounded-full text-xs glass-panel text-white/70 hover:text-white transition-colors"
                    >
                      <span className={`mr-1 font-semibold ${i < 3 ? 'text-cyan-400' : 'text-white/30'}`}>{i + 1}</span>
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 结果 */}
        {loading && <LoadingBlock label="搜索中..." />}

        {!loading && searched && error && (
          <div className="text-center py-16 text-white/40">
            <p className="text-4xl mb-3">📡</p>
            <p className="text-white/60">{error}</p>
            <button
              onClick={() => doSearch(keyword.trim(), type)}
              className="mt-4 px-5 py-2 rounded-xl text-sm bg-white/10 text-white hover:bg-white/15 transition-colors"
            >
              重新搜索
            </button>
          </div>
        )}

        {!loading && searched && !error && resultCount === 0 && (
          <div className="text-center py-16 text-white/40">
            <p className="text-4xl mb-3">🎵</p>
            <p>没有找到相关内容，换个关键词试试</p>
          </div>
        )}

        {/* 单曲结果 */}
        {!loading && !error && type === 'song' && songs.length > 0 && (
          <TrackList tracks={songs.map(toTrack)} />
        )}

        {/* 歌手结果 */}
        {!loading && !error && type === 'artist' && artists.length > 0 && (
          <div className="flex flex-wrap justify-center gap-8">
            {artists.map((a) => (
              <ArtistCard key={a.id} artist={a} onClick={() => router.push(`/singer/${a.id}`)} />
            ))}
          </div>
        )}

        {/* 歌单结果 */}
        {!loading && !error && type === 'playlist' && playlists.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {playlists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} onClick={() => router.push(`/songlist/${p.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-cyan-400 animate-spin" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
