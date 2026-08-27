'use client';

/**
 * 搜索页 - 在线曲库搜索
 * 接入网易云公开搜索接口（服务端代理），结果整列入队播放。
 */
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { searchSongs, toTrack } from '@/lib/api';
import type { NetEaseSong } from '@/lib/server/netEase';
import { useMusicStore } from '@/lib/store';
import { Sparkles } from '@/components/ui/aceternity/sparkles';
import ShinyText from '@/components/ui/reactbits/ShinyText';

function formatDuration(ms: number): string {
  if (!ms) return '--:--';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function SearchContent() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get('q') ?? '';

  const [keyword, setKeyword] = useState(initial);
  const [results, setResults] = useState<NetEaseSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);

  const playQueueFrom = useMusicStore((s) => s.playQueueFrom);
  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    setError(false);
    try {
      const songs = await searchSongs(q, 30);
      setResults(songs);
      setError(songs.length === 0);
    } catch {
      setError(true);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initial) {
      setKeyword(initial);
      doSearch(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    if (!q) return;
    router.replace(`/search?q=${encodeURIComponent(q)}`);
    doSearch(q);
  };

  const handlePlay = (index: number) => {
    const tracks = results.map(toTrack);
    playQueueFrom(tracks, index);
  };

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 relative">
      <Sparkles density={20} color="#00d9f5" className="opacity-15" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <ShinyText
            text="搜索音乐"
            speed={3}
            className="text-3xl md:text-4xl font-bold"
            shineColor="#a5f3fc"
            color="#22d3ee"
          />
          <p className="text-white/40 mt-1 text-sm">海量曲库 · 在线即点即播</p>
        </motion.div>

        {/* 搜索框 */}
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onSubmit={handleSubmit}
          className="mb-8"
        >
          <div className="glass-panel px-5 py-4 flex items-center gap-3 focus-within:border-white/25 transition-colors">
            <svg className="w-5 h-5 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索歌曲、歌手、专辑..."
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

        {/* 结果 */}
        <div className="space-y-2">
          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-cyan-400 animate-spin" />
            </div>
          )}

          {!loading && searched && error && (
            <div className="text-center py-16 text-white/40">
              <p className="text-4xl mb-3">🎵</p>
              <p>没有找到相关歌曲，换个关键词试试</p>
            </div>
          )}

          {!loading &&
            results.map((song, i) => {
              const active = currentSong?.id === song.id;
              const playing = active && isPlaying;
              return (
                <motion.button
                  key={song.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.6) }}
                  onClick={() => handlePlay(i)}
                  className={`w-full flex items-center gap-4 p-3 rounded-2xl text-left transition-all group ${
                    active
                      ? 'bg-white/10 border border-white/20'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className="w-6 text-center text-sm text-white/30 flex-shrink-0 tabular-nums">
                    {active && playing ? (
                      <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                    ) : (
                      i + 1
                    )}
                  </span>

                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 relative">
                    <Image src={song.cover} alt={song.name} width={48} height={48} className="object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${active ? 'text-cyan-300' : 'text-white'}`}>
                      {song.name}
                    </p>
                    <p className="text-xs text-white/50 truncate">
                      {song.artists}
                      {song.album ? ` · ${song.album}` : ''}
                    </p>
                  </div>

                  {song.fee > 0 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                      VIP
                    </span>
                  )}

                  <span className="text-xs text-white/40 tabular-nums flex-shrink-0 hidden sm:block">
                    {formatDuration(song.duration)}
                  </span>

                  <span className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-cyan-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </motion.button>
              );
            })}
        </div>
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
