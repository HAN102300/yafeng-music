'use client';

/**
 * 排行榜页（API 化重构版）
 * 真实网易云官方榜单（toplist 接口）：左侧榜单选择 + 右侧真实曲目列表。
 * 支持从首页带 ?top=<id> 直达指定榜单。
 */
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { fetchToplists, fetchPlaylistDetail, toTrack, ApiError } from '@/lib/api';
import type { NetEaseToplist, NetEaseSong } from '@/lib/server/netEase';
import { useMusicStore } from '@/lib/store';
import { Sparkles } from '@/components/ui/aceternity/sparkles';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingBlock, ErrorBlock } from '@/components/ui/StateViews';
import { formatPlayCount } from '@/lib/format';

function TopContent() {
  const searchParams = useSearchParams();
  const topParam = searchParams.get('top');

  const [toplists, setToplists] = useState<NetEaseToplist[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [songs, setSongs] = useState<NetEaseSong[]>([]);
  const [meta, setMeta] = useState<{ playCount: number; trackCount: number } | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const playQueueFrom = useMusicStore((s) => s.playQueueFrom);
  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);

  // 榜单目录
  useEffect(() => {
    (async () => {
      setListLoading(true);
      try {
        const list = await fetchToplists();
        setToplists(list);
        setError(null);
        if (list.length > 0) {
          const fromParam = topParam ? list.find((t) => t.id === Number(topParam)) : undefined;
          setActiveId((fromParam ?? list[0]).id);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : '榜单加载失败');
      } finally {
        setListLoading(false);
      }
    })();
  }, [topParam]);

  // 当前榜单曲目
  const loadChart = useCallback(async (id: number) => {
    setDetailError(null);
    try {
      const res = await fetchPlaylistDetail(id, 100);
      setSongs(res.songs);
      setMeta({ playCount: res.playlist.playCount, trackCount: res.total });
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : '榜单曲目加载失败');
    }
  }, []);

  useEffect(() => {
    if (activeId) loadChart(activeId);
  }, [activeId, loadChart]);

  if (listLoading) return <LoadingBlock label="正在加载榜单..." />;
  if (error)
    return <ErrorBlock message={error} onRetry={() => location.reload()} />;

  return (
    <div className="max-w-6xl mx-auto relative z-10">
      {/* 页面标题 */}
      <PageHeader title="排行榜" subtitle="官方真实榜单 · 实时更新 · 点击整榜入队播放" />

      <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
        {/* 左侧：榜单选择（lg 桌面端 sticky 固定，仅右侧曲目滚动） */}
        <div className="lg:w-64 lg:sticky lg:top-24 shrink-0 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[calc(100vh-140px)] pb-2 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          {toplists.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all border shrink-0 lg:w-full min-w-[180px] ${
                activeId === t.id
                  ? 'bg-white/10 border-amber-500/40'
                  : 'border-transparent hover:bg-white/5'
              }`}
            >
              <div className="w-11 h-11 rounded-xl overflow-hidden relative shrink-0">
                <Image src={t.cover} alt={t.name} width={44} height={44} className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium truncate ${activeId === t.id ? 'text-amber-300' : 'text-white'}`}>
                  {t.name}
                </p>
                <p className="text-[11px] text-white/40 truncate">{t.updateFrequency}</p>
              </div>
            </button>
          ))}
        </div>

        {/* 右侧：当前榜单 */}
        <div className="flex-1 min-w-0">
          {detailError && <ErrorBlock message={detailError} onRetry={() => activeId && loadChart(activeId)} />}

          {!detailError && songs.length === 0 && <LoadingBlock label="正在加载曲目..." />}

          {!detailError && songs.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4 px-1">
                <p className="text-sm text-white/40">
                  {meta && (
                    <>
                      共 {meta.trackCount} 首 · 播放量 {formatPlayCount(meta.playCount)}
                    </>
                  )}
                </p>
                <button
                  onClick={() => playQueueFrom(songs.map(toTrack), 0)}
                  className="px-4 py-2 rounded-xl text-sm bg-gradient-primary text-white on-accent hover:opacity-90 transition-opacity"
                >
                  ▶ 播放整榜
                </button>
              </div>

              <div className="space-y-1.5">
                {songs.map((song, i) => {
                  const isCurrent = currentSong?.id === song.id;
                  return (
                    <motion.button
                      key={song.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.5) }}
                      onClick={() => playQueueFrom(songs.map(toTrack), i)}
                      className={`w-full flex items-center gap-4 p-3 rounded-2xl text-left transition-all group border ${
                        isCurrent
                          ? 'bg-white/10 border-pri-mix-45 shadow-lg'
                          : 'border-transparent hover:bg-white/5'
                      }`}
                    >
                      {/* 排名 */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          i < 3
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {i + 1}
                      </div>

                      {/* 封面 */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative bg-white/5">
                        <Image
                          src={song.cover}
                          alt={song.name}
                          width={48}
                          height={48}
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        {isCurrent && isPlaying && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="flex items-end gap-0.5 h-4">
                              <div className="w-0.5 bg-acc rounded-full animate-pulse" style={{ height: '60%' }} />
                              <div className="w-0.5 bg-acc rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.15s' }} />
                              <div className="w-0.5 bg-acc rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0.3s' }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate flex items-center gap-1.5 ${isCurrent ? 'text-acc' : 'text-white'}`}>
                          <span className="truncate">{song.name}</span>
                          {song.fee > 0 && (
                            <span className="px-1.5 py-px rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                              VIP
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-white/50 truncate">{song.artists}</p>
                      </div>

                      {/* 专辑 */}
                      <span className="text-sm text-white/40 truncate hidden xl:block w-40">{song.album}</span>

                      {/* 播放图标 */}
                      <div className="w-8 flex items-center justify-center">
                        {!isCurrent && (
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MusicTopPage() {
  return (
    <div className="min-h-screen py-8 px-4 md:px-8 relative">
      <Sparkles density={20} color="var(--color-primary)" className="opacity-15" />
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-amber-400 animate-spin" />
          </div>
        }
      >
        <TopContent />
      </Suspense>
    </div>
  );
}
