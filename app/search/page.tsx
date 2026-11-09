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
import { PageHeader } from '@/components/ui/PageHeader';
import { TrackList } from '@/components/ui/TrackList';
import { ArtistCard } from '@/components/cards/ArtistCard';
import { PlaylistCard } from '@/components/cards/PlaylistCard';
import { LoadingBlock, PlaylistSkeleton, ArtistSkeleton, ErrorBlock, EmptyBlock } from '@/components/ui/StateViews';
import { desktopStorage } from '@/lib/desktopStorage';

type SearchType = 'song' | 'artist' | 'playlist';
const HISTORY_KEY = 'yafeng-search-history';
const TYPE_TABS: { id: SearchType; label: string; icon: string }[] = [
  { id: 'song', label: '单曲', icon: '🎵' },
  { id: 'artist', label: '歌手', icon: '🎤' },
  { id: 'playlist', label: '歌单', icon: '📋' },
];

/** 搜索历史读取（桌面=Tauri Store 文件 / web=localStorage） */
async function readHistory(): Promise<string[]> {
  try {
    const raw = await desktopStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
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

  /** 写入历史（去重、上限 10 条）并刷新 state；持久化到 desktopStorage */
  const pushHistory = useCallback(async (q: string): Promise<string[]> => {
    const list = await readHistory();
    const next = [q, ...list.filter((h) => h !== q)].slice(0, 10);
    await desktopStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  }, []);

  /** 清空历史 */
  const clearHistory = useCallback(async () => {
    await desktopStorage.removeItem(HISTORY_KEY);
  }, []);

  useEffect(() => {
    readHistory().then(setHistory).catch(() => {});
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
      void pushHistory(initial).then(setHistory);
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
    void pushHistory(q).then(setHistory);
    doSearch(q, type);
  };

  const handleKeyword = (q: string) => {
    setKeyword(q);
    void pushHistory(q).then(setHistory);
    router.replace(`/search?q=${encodeURIComponent(q)}`);
    doSearch(q, type);
  };

  const resultCount = type === 'song' ? songs.length : type === 'artist' ? artists.length : playlists.length;

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 relative">
      <Sparkles density={20} color="var(--color-primary)" className="opacity-15" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* 标题 */}
        <PageHeader center title="搜索音乐" subtitle="全库搜索 · 单曲 / 歌手 / 歌单" />

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
              className="px-5 py-2 rounded-xl text-sm font-medium bg-gradient-primary text-white on-accent hover:opacity-90 transition-opacity flex-shrink-0"
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
                  ? 'bg-white/10 text-acc border-acc-mix-35'
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
                      <span className={`mr-1 font-semibold ${i < 3 ? 'text-acc' : 'text-white/30'}`}>{i + 1}</span>
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 结果 */}
        {loading && type === 'playlist' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <PlaylistSkeleton key={i} />
            ))}
          </div>
        )}
        {loading && type === 'artist' && (
          <div className="flex flex-wrap justify-center gap-8">
            {Array.from({ length: 6 }, (_, i) => (
              <ArtistSkeleton key={i} />
            ))}
          </div>
        )}
        {loading && type === 'song' && <LoadingBlock label="搜索中..." />}

        {!loading && searched && error && (
          <ErrorBlock message={error} onRetry={() => doSearch(keyword.trim(), type)} />
        )}

        {!loading && searched && !error && resultCount === 0 && (
          <EmptyBlock
            icon="🎵"
            title="未找到相关内容"
            desc="换个关键词试试，或者浏览热门搜索"
          >
            <button
              onClick={() => {
                setSearched(false);
                setKeyword('');
              }}
              className="px-5 py-2 rounded-xl text-sm bg-white/10 text-white hover:bg-white/15 transition-colors"
            >
              清除搜索
            </button>
          </EmptyBlock>
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
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-acc animate-spin" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
