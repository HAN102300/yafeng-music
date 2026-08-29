'use client';

/**
 * 专辑详情页：封面头图 + 发行信息 + 全部曲目，整列入队播放。
 */
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { fetchAlbumDetail, toTrack, ApiError } from '@/lib/api';
import type { NetEaseAlbum, NetEaseSong } from '@/lib/server/netEase';
import { useMusicStore } from '@/lib/store';
import { TrackList } from '@/components/ui/TrackList';
import { LoadingBlock, ErrorBlock } from '@/components/ui/StateViews';
import { GlowingButton } from '@/components/ui/aceternity/glowing-button';

export default function AlbumDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const albumId = Number(params?.id);

  const [album, setAlbum] = useState<NetEaseAlbum | null>(null);
  const [songs, setSongs] = useState<NetEaseSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const playQueueFrom = useMusicStore((s) => s.playQueueFrom);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAlbumDetail(albumId);
      setAlbum(res.album);
      setSongs(res.songs);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '专辑加载失败');
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    if (albumId) load();
  }, [albumId, load]);

  if (loading) return <LoadingBlock label="正在打开专辑..." />;
  if (error)
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <ErrorBlock message={error} onRetry={load} />
      </div>
    );
  if (!album) return null;

  const publishYear = album.publishTime ? new Date(album.publishTime).getFullYear() : null;

  return (
    <div className="min-h-screen pb-16">
      {/* ===== 专辑头 ===== */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image src={album.cover} alt="" fill sizes="100vw" className="object-cover scale-125 blur-3xl opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-dark-base)]/40 via-[var(--color-dark-base)]/80 to-[var(--color-dark-base)]" />
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-28 pb-8 flex flex-col md:flex-row gap-6 md:gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-44 h-44 md:w-56 md:h-56 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 relative shrink-0 mx-auto md:mx-0"
          >
            <Image src={album.cover} alt={album.name} fill sizes="224px" className="object-cover" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 text-center md:text-left"
          >
            <p className="text-xs uppercase tracking-widest text-white/40 mb-2">专辑</p>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 break-words">{album.name}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-white/50 mb-3">
              {album.artist && <span>歌手：{album.artist}</span>}
              {publishYear && <span>发行：{publishYear}</span>}
              <span>共 {songs.length} 首</span>
              {album.company && <span className="hidden md:inline">厂牌：{album.company}</span>}
            </div>
            {album.description && (
              <p className="text-sm text-white/40 line-clamp-2 max-w-xl mx-auto md:mx-0">{album.description}</p>
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
      </div>
    </div>
  );
}
