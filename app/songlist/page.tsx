'use client';

/**
 * 歌单广场（API 化重构版）
 * 真实网易云歌单数据：分类 tab（catalogue 接口）+ 热门/精品歌单网格 + 分页加载。
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchPlaylistCatalogue, fetchHotPlaylists, ApiError } from '@/lib/api';
import type { NetEasePlaylist } from '@/lib/server/netEase';
import { PlaylistCard } from '@/components/cards/PlaylistCard';
import { Sparkles } from '@/components/ui/aceternity/sparkles';
import { GlowingButton } from '@/components/ui/aceternity/glowing-button';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/ui/StateViews';

const PAGE_SIZE = 35;
/** 常用分类置顶 */
const PINNED_CATS = ['全部', '华语', '流行', '摇滚', '民谣', '电子', '说唱', '古风', '欧美', '日语', '轻音乐'];

export default function SongListPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>(PINNED_CATS);
  const [activeCat, setActiveCat] = useState('全部');
  const [highquality, setHighquality] = useState(false);
  const [playlists, setPlaylists] = useState<NetEasePlaylist[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 分类目录（catalogue 接口，失败则用置顶默认分类）
  useEffect(() => {
    fetchPlaylistCatalogue()
      .then((cats) => {
        if (cats.length === 0) return;
        const hot = cats.filter((c) => c.hot).map((c) => c.name);
        const merged = Array.from(new Set([...PINNED_CATS, ...hot]));
        setCategories(merged);
      })
      .catch(() => {});
  }, []);

  const loadPage = useCallback(
    async (cat: string, high: boolean, offset: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetchHotPlaylists(cat, PAGE_SIZE, offset, high);
        setPlaylists((prev) => (append ? [...prev, ...res.playlists] : res.playlists));
        setHasMore(res.more);
      } catch (err) {
        if (!append) setError(err instanceof ApiError ? err.message : '歌单加载失败');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    loadPage(activeCat, highquality, 0, false);
  }, [activeCat, highquality, loadPage]);

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 relative">
      <Sparkles density={25} color="var(--color-primary)" className="opacity-20" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* 页面标题 */}
        <PageHeader
          title="歌单广场"
          subtitle="海量在线歌单 · 真实曲库即点即播"
          action={
            <button
              onClick={() => setHighquality(!highquality)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                highquality
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'glass-panel text-white/60 hover:text-white border-white/10'
              }`}
            >
              ✨ {highquality ? '精品歌单' : '切换精品'}
            </button>
          }
        />

        {/* 分类标签（catalogue 真实数据） */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 mb-8"
        >
          {categories.map((cat) => (
            <GlowingButton
              key={cat}
              variant={activeCat === cat ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveCat(cat)}
            >
              {cat}
            </GlowingButton>
          ))}
        </motion.div>

        {error && <ErrorBlock message={error} onRetry={() => loadPage(activeCat, highquality, 0, false)} />}
        {loading && !error && <LoadingBlock label="正在加载歌单..." />}

        {!error && !loading && playlists.length === 0 && (
          <EmptyBlock icon="📋" title="该分类下暂无歌单" desc="换个分类试试" />
        )}

        {/* 歌单网格 */}
        {!error && !loading && playlists.length > 0 && (
          <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
            <AnimatePresence mode="popLayout">
              {playlists.map((playlist, index) => (
                <motion.div
                  key={playlist.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ delay: Math.min((index % PAGE_SIZE) * 0.03, 0.4) }}
                >
                  <PlaylistCard playlist={playlist} onClick={() => router.push(`/songlist/${playlist.id}`)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* 加载更多 */}
        {hasMore && !loading && (
          <div className="flex justify-center mt-10">
            <GlowingButton
              variant="secondary"
              size="md"
              onClick={() => loadPage(activeCat, highquality, playlists.length, true)}
            >
              {loadingMore ? '加载中...' : '加载更多'}
            </GlowingButton>
          </div>
        )}
      </div>
    </div>
  );
}
