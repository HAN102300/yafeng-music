'use client';

/**
 * 歌单详情页（新增）：真实歌单曲目列表，整列入队播放，分页加载全部曲目。
 */
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { fetchPlaylistDetail, toTrack, ApiError } from '@/lib/api';
import type { NetEaseSong, NetEasePlaylist } from '@/lib/server/netEase';
import { useMusicStore } from '@/lib/store';
import { TrackList } from '@/components/ui/TrackList';
import { LoadingBlock, ErrorBlock } from '@/components/ui/StateViews';
import { GlowingButton } from '@/components/ui/aceternity/glowing-button';
import { formatPlayCount } from '@/lib/format';

const PAGE_SIZE = 100;

export default function PlaylistDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const playlistId = Number(params?.id);

  const [meta, setMeta] = useState<NetEasePlaylist | null>(null);
  const [songs, setSongs] = useState<NetEaseSong[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playQueueFrom = useMusicStore((s) => s.playQueueFrom);

  const loadPage = useCallback(
    async (offset: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await fetchPlaylistDetail(playlistId, PAGE_SIZE, offset);
        setMeta(res.playlist);
        setTotal(res.total);
        setSongs((prev) => (append ? [...prev, ...res.songs] : res.songs));
        setError(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : '歌单加载失败');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [playlistId]
  );

  useEffect(() => {
    if (playlistId) loadPage(0, false);
  }, [playlistId, loadPage]);

  if (loading) return <LoadingBlock label="正在打开歌单..." />;
  if (error)
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <ErrorBlock message={error} onRetry={() => loadPage(0, false)} />
      </div>
    );
  if (!meta) return null;

  const hasMore = songs.length < total;

  return (
    <div className="min-h-screen pb-16">
      {/* ===== 歌单头 ===== */}
      <div className="relative overflow-hidden">
        {/* 封面模糊背景 */}
        <div className="absolute inset-0 -z-10">
          <Image src={meta.cover} alt="" fill sizes="100vw" className="object-cover scale-125 blur-3xl opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a]/40 via-[#0a0a1a]/80 to-[#0a0a1a]" />
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-28 pb-8 flex flex-col md:flex-row gap-6 md:gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-44 h-44 md:w-56 md:h-56 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 relative shrink-0 mx-auto md:mx-0"
          >
            <Image src={meta.cover} alt={meta.name} fill sizes="224px" className="object-cover" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 text-center md:text-left"
          >
            <p className="text-xs uppercase tracking-widest text-white/40 mb-2">歌单</p>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">{meta.name}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-white/50 mb-3">
              {meta.creator && <span>创建者：{meta.creator}</span>}
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {formatPlayCount(meta.playCount)}次播放
              </span>
              <span>共 {total} 首</span>
            </div>
            {meta.description && (
              <p className="text-sm text-white/40 line-clamp-2 max-w-xl mx-auto md:mx-0">{meta.description}</p>
            )}
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-6">
              <GlowingButton size="md" onClick={() => playQueueFrom(songs.map(toTrack), 0)}>
                ▶ 播放全部
              </GlowingButton>
              <GlowingButton size="md" variant="secondary" onClick={() => router.back()}>
                ← 返回
              </GlowingButton>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ===== 曲目列表 ===== */}
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <TrackList tracks={songs.map(toTrack)} />

        {hasMore && (
          <div className="flex justify-center mt-8">
            <GlowingButton
              variant="secondary"
              size="md"
              onClick={() => loadPage(songs.length, true)}
            >
              {loadingMore ? '加载中...' : `加载更多（已加载 ${songs.length}/${total}）`}
            </GlowingButton>
          </div>
        )}
      </div>
    </div>
  );
}
