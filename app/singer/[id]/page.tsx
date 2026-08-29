'use client';

/**
 * 歌手详情页（新增）：歌手信息 + 热门歌曲，整列入队播放。
 */
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { fetchArtist, toTrack, ApiError } from '@/lib/api';
import type { NetEaseSong, NetEaseArtist } from '@/lib/server/netEase';
import { useMusicStore } from '@/lib/store';
import { TrackList } from '@/components/ui/TrackList';
import { LoadingBlock, ErrorBlock } from '@/components/ui/StateViews';
import { GlowingButton } from '@/components/ui/aceternity/glowing-button';

export default function ArtistDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const artistId = Number(params?.id);

  const [artist, setArtist] = useState<NetEaseArtist | null>(null);
  const [songs, setSongs] = useState<NetEaseSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const playQueueFrom = useMusicStore((s) => s.playQueueFrom);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchArtist(artistId);
      setArtist(res.artist);
      setSongs(res.songs);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '歌手信息加载失败');
    } finally {
      setLoading(false);
    }
  }, [artistId]);

  useEffect(() => {
    if (artistId) load();
  }, [artistId, load]);

  if (loading) return <LoadingBlock label="正在打开歌手主页..." />;
  if (error)
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <ErrorBlock message={error} onRetry={load} />
      </div>
    );
  if (!artist) return null;

  return (
    <div className="min-h-screen pb-16">
      {/* ===== 歌手头 ===== */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image src={artist.avatar} alt="" fill sizes="100vw" className="object-cover scale-125 blur-3xl opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a]/40 via-[#0a0a1a]/80 to-[#0a0a1a]" />
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-28 pb-8 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden ring-4 ring-purple-500/40 shadow-2xl shadow-purple-500/20 relative shrink-0"
          >
            <Image src={artist.avatar} alt={artist.name} fill sizes="208px" className="object-cover" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 text-center md:text-left"
          >
            <p className="text-xs uppercase tracking-widest text-white/40 mb-2">歌手主页</p>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{artist.name}</h1>
            {artist.alias && <p className="text-white/50 mb-2">{artist.alias}</p>}
            {artist.musicSize !== undefined && artist.musicSize > 0 && (
              <p className="text-sm text-white/40 mb-3">热门歌曲 {artist.musicSize} 首</p>
            )}
            {artist.briefDesc && (
              <p className="text-sm text-white/40 line-clamp-2 max-w-xl mx-auto md:mx-0">{artist.briefDesc}</p>
            )}
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-6">
              <GlowingButton size="md" onClick={() => playQueueFrom(songs.map(toTrack), 0)}>
                ▶ 播放热门 {songs.length} 首
              </GlowingButton>
              <GlowingButton size="md" variant="secondary" onClick={() => router.back()}>
                ← 返回
              </GlowingButton>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ===== 热门歌曲 ===== */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-4">
        <h2 className="text-xl font-bold text-white mb-4">🔥 热门歌曲</h2>
        <TrackList tracks={songs.map(toTrack)} />
      </div>
    </div>
  );
}
