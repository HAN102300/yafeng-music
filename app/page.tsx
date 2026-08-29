'use client';

/**
 * 首页（API 化重构版）
 * 数据全部来自网易云在线曲库：推荐歌单 / 推荐新歌 / 官方榜单 / 热门歌手。
 * React Bits (Aurora/SplitText/ShinyText) + Aceternity (TextGenerateEffect/GlowingButton/Sparkles)
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  fetchPersonalized,
  fetchNewSongs,
  fetchToplists,
  fetchHotArtists,
  fetchHotChartTracks,
  fetchDailyRecommend,
  fetchPersonalFM,
  toTrack,
  ApiError,
} from '@/lib/api';
import type { NetEasePlaylist, NetEaseArtist, NetEaseSong, NetEaseToplist } from '@/lib/server/netEase';
import type { Track } from '@/lib/data';
import { useMusicStore } from '@/lib/store';
import { useNcmProfile } from '@/lib/ncmAuth';
import { toast } from '@/lib/toast';
import { useQualityTier } from '@/hooks/useQualityTier';
import SplitText from '@/components/ui/reactbits/SplitText';
import TiltedCard from '@/components/ui/reactbits/TiltedCard';
import ShinyText from '@/components/ui/reactbits/ShinyText';
import { TextGenerateEffect } from '@/components/ui/aceternity/text-generate-effect';
import { GlowingButton } from '@/components/ui/aceternity/glowing-button';
import { Sparkles } from '@/components/ui/aceternity/sparkles';
import { CircularVisualizer } from '@/components/visualizer/CircularVisualizer';
import { PlaylistCard } from '@/components/cards/PlaylistCard';
import { ArtistCard } from '@/components/cards/ArtistCard';
import { TrackList } from '@/components/ui/TrackList';
import { LoadingBlock, ErrorBlock } from '@/components/ui/StateViews';

// ogl WebGL 背景：懒加载 + 禁 SSR
const Aurora = dynamic(() => import('@/components/ui/reactbits/Aurora'), { ssr: false });

interface HomeData {
  playlists: NetEasePlaylist[];
  newSongs: NetEaseSong[];
  toplists: NetEaseToplist[];
  artists: NetEaseArtist[];
}

export default function HomePage() {
  const router = useRouter();
  const quality = useQualityTier();

  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const playQueueFrom = useMusicStore((s) => s.playQueueFrom);

  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  // 登录用户的每日推荐
  const profile = useNcmProfile();
  const [dailySongs, setDailySongs] = useState<NetEaseSong[]>([]);
  const [fmLoading, setFmLoading] = useState(false);

  useEffect(() => {
    if (!profile) {
      setDailySongs([]);
      return;
    }
    fetchDailyRecommend()
      .then(setDailySongs)
      .catch(() => {});
  }, [profile]);

  /** 私人 FM 一键开播 */
  const handleStartFM = async () => {
    if (fmLoading) return;
    setFmLoading(true);
    try {
      const songs = await fetchPersonalFM();
      if (songs.length === 0) throw new Error('empty');
      playQueueFrom(songs.map(toTrack), 0);
      toast('私人 FM 已开播 🎧', 'success');
    } catch {
      toast('私人 FM 暂不可用（需要登录网易云账号）', 'error');
    } finally {
      setFmLoading(false);
    }
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const [playlists, newSongs, toplists, artists] = await Promise.all([
        fetchPersonalized(12),
        fetchNewSongs(8),
        fetchToplists(),
        fetchHotArtists(12),
      ]);
      setData({ playlists, newSongs, toplists, artists });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '内容加载失败');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** 开始聆听：热歌榜整列入队 */
  const handleStartListening = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const tracks = await fetchHotChartTracks(30);
      if (tracks.length === 0) throw new Error('empty');
      playQueueFrom(tracks, 0);
    } catch {
      router.push('/musictop');
    } finally {
      setStarting(false);
    }
  };

  const handlePlaySong = (song: Track) => {
    const tracks = (data?.newSongs ?? []).map(toTrack);
    const idx = tracks.findIndex((t) => t.id === song.id);
    playQueueFrom(tracks, Math.max(0, idx));
  };

  return (
    <div className="min-h-screen relative">
      {/* ===== Hero 区 ===== */}
      <section className="relative h-[72vh] min-h-[520px] flex flex-col items-center justify-center overflow-hidden">
        {/* Aurora 背景（low 档降级为静态渐变） */}
        <div className="absolute inset-0 -z-10">
          {quality === 'low' ? (
            <div
              className="w-full h-full"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 0%, rgba(82,39,255,0.35) 0%, rgba(12,12,29,0) 60%)',
              }}
            />
          ) : (
            <Aurora colorStops={['#5227FF', '#a855f7', '#ec4899']} amplitude={1.1} blend={0.55} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-transparent to-transparent" />
        </div>

        {quality === 'high' && <Sparkles density={30} color="#a5b4fc" className="opacity-40" />}

        {/* 标题 */}
        <SplitText
          text="雅枫音乐"
          tag="h1"
          delay={90}
          duration={0.9}
          className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-white to-pink-300 drop-shadow-2xl"
        />
        <TextGenerateEffect
          words="海量在线曲库 · 让音乐看得见"
          className="text-xl md:text-2xl text-white/70 mt-2 text-center"
        />

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-4 mt-10"
        >
          <GlowingButton size="lg" onClick={handleStartListening}>
            {starting ? '正在准备...' : '🎧 开始聆听'}
          </GlowingButton>
          <GlowingButton size="lg" variant="secondary" onClick={() => router.push('/visualizer')}>
            🌌 进入可视化
          </GlowingButton>
        </motion.div>

        {/* 滚动提示 */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="absolute bottom-6 text-white/30 text-2xl"
        >
          ↓
        </motion.div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        {/* ===== 正在播放（绑定全局引擎） ===== */}
        {currentSong && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <div
              className="relative flex flex-col md:flex-row items-center gap-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 md:p-8 overflow-hidden"
              style={{ boxShadow: isPlaying ? 'var(--glow-primary, none)' : 'none' }}
            >
              <div className="shrink-0">
                <CircularVisualizer size={180} showCover coverUrl={currentSong.cover} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-2">
                  {isPlaying ? 'Now Playing · 正在播放' : '已暂停'}
                </p>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-1">{currentSong.title}</h3>
                <p className="text-white/60">{currentSong.artist}</p>
                <div className="mt-5 flex flex-wrap justify-center md:justify-start gap-3">
                  <GlowingButton size="sm" onClick={() => router.push('/visualizer')}>
                    进入沉浸式可视化 →
                  </GlowingButton>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {error && <ErrorBlock message={error} onRetry={load} />}
        {!error && !data && <LoadingBlock label="正在连接在线曲库..." />}

        {data && (
          <>
            {/* ===== 今日推荐（登录用户） ===== */}
            {profile && dailySongs.length > 0 && (
              <section className="mb-16">
                <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
                  <div>
                    <ShinyText text="每日推荐" speed={3} className="text-3xl font-bold" shineColor="#bbf7d0" color="#34d399" />
                    <p className="text-white/40 text-sm mt-1">根据你的口味每天 6:00 更新</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleStartFM}
                      disabled={fmLoading}
                      className="px-4 py-2 rounded-xl text-sm bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                      {fmLoading ? '连接中...' : '📻 私人FM'}
                    </button>
                    <button
                      onClick={() => playQueueFrom(dailySongs.map(toTrack), 0)}
                      className="px-4 py-2 rounded-xl text-sm bg-gradient-primary text-white hover:opacity-90 transition-opacity"
                    >
                      ▶ 播放全部
                    </button>
                  </div>
                </div>
                <TrackList tracks={dailySongs.slice(0, 8).map(toTrack)} />
              </section>
            )}

            {/* ===== 推荐歌单 ===== */}
            <section className="mb-16">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <ShinyText text="推荐歌单" speed={3} className="text-3xl font-bold" shineColor="#fbcfe8" color="#f472b6" />
                  <p className="text-white/40 text-sm mt-1">每日更新的精选合集</p>
                </div>
                <button
                  onClick={() => router.push('/songlist')}
                  className="text-sm text-white/50 hover:text-white transition-colors"
                >
                  歌单广场 →
                </button>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 [&::-webkit-scrollbar]:h-[6px] [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                {data.playlists.map((playlist, index) => (
                  <motion.div
                    key={playlist.id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(index * 0.05, 0.5) }}
                    className="w-40 md:w-48 shrink-0"
                  >
                    <PlaylistCard playlist={playlist} onClick={() => router.push(`/songlist/${playlist.id}`)} />
                  </motion.div>
                ))}
              </div>
            </section>

            {/* ===== 推荐新歌（TiltedCard） ===== */}
            <section className="mb-16">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <ShinyText text="新歌速递" speed={3} className="text-3xl font-bold" shineColor="#e9d5ff" color="#a78bfa" />
                  <p className="text-white/40 text-sm mt-1">点击封面即刻播放</p>
                </div>
                <button
                  onClick={() => router.push('/musictop')}
                  className="text-sm text-white/50 hover:text-white transition-colors"
                >
                  查看排行 →
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {data.newSongs.map((song, index) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: (index % 4) * 0.08 }}
                  >
                    <TiltedCard
                      imageSrc={song.cover}
                      altText={song.name}
                      captionText={`${song.name} - ${song.artists}`}
                      containerWidth="100%"
                      containerHeight="220px"
                      imageWidth="100%"
                      imageHeight="220px"
                      rotateAmplitude={10}
                      scaleOnHover={1.06}
                      displayOverlayContent
                      onClick={() => handlePlaySong(toTrack(song))}
                      overlayContent={
                        <div className="flex items-end justify-between rounded-b-[15px] bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-10 w-full">
                          <div className="min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{song.name}</p>
                            <p className="text-white/60 text-xs truncate">{song.artists}</p>
                          </div>
                          <div className="w-9 h-9 shrink-0 rounded-full bg-purple-500/90 flex items-center justify-center shadow-lg shadow-purple-500/40">
                            {currentSong?.id === song.id && isPlaying ? (
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </div>
                        </div>
                      }
                    />
                  </motion.div>
                ))}
              </div>
            </section>

            {/* ===== 官方榜单入口 ===== */}
            {data.toplists.length > 0 && (
              <section className="mb-16">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <ShinyText text="官方榜单" speed={3} className="text-3xl font-bold" shineColor="#fde68a" color="#f59e0b" />
                    <p className="text-white/40 text-sm mt-1">实时更新的权威排行</p>
                  </div>
                  <button
                    onClick={() => router.push('/musictop')}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    全部榜单 →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {data.toplists.slice(0, 4).map((toplist, index) => (
                    <motion.div
                      key={toplist.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.06 }}
                      onClick={() => router.push(`/musictop?top=${toplist.id}`)}
                      className="group relative rounded-2xl overflow-hidden border border-white/10 cursor-pointer hover:border-amber-500/40 transition-colors"
                    >
                      <div className="relative h-32">
                        <Image
                          src={toplist.cover}
                          alt={toplist.name}
                          fill
                          sizes="(max-width: 640px) 100vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4">
                          <h3 className="text-white font-bold">{toplist.name}</h3>
                          <p className="text-white/50 text-xs mt-0.5">{toplist.updateFrequency}</p>
                        </div>
                      </div>
                      <div className="p-3 space-y-1.5 bg-black/30">
                        {toplist.tracks.slice(0, 3).map((t, i) => (
                          <p key={i} className="text-xs text-white/50 truncate">
                            <span className={`mr-1.5 font-semibold ${i === 0 ? 'text-amber-400' : 'text-white/30'}`}>
                              {i + 1}
                            </span>
                            {t.first} - {t.second}
                          </p>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* ===== 热门歌手 ===== */}
            {data.artists.length > 0 && (
              <section className="mb-20">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <ShinyText text="热门歌手" speed={3} className="text-3xl font-bold" shineColor="#a5f3fc" color="#22d3ee" />
                    <p className="text-white/40 text-sm mt-1">发现你喜爱的音乐人</p>
                  </div>
                  <button
                    onClick={() => router.push('/singer')}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    全部歌手 →
                  </button>
                </div>

                <div className="flex gap-6 overflow-x-auto pb-4 [&::-webkit-scrollbar]:h-[6px] [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                  {data.artists.map((artist, index) => (
                    <motion.div
                      key={artist.id}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: Math.min(index * 0.03, 0.4) }}
                      className="shrink-0"
                    >
                      <ArtistCard artist={artist} onClick={() => router.push(`/singer/${artist.id}`)} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
