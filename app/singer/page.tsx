'use client';

/**
 * 歌手页（API 化重构版）
 * 真实热门歌手数据（artist-top 接口）+ ChromaGrid 歌手墙 + 歌手搜索。
 * 点击歌手 → /singer/[id] 详情页（热门50首可直接播放）。
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { fetchHotArtists, searchArtists, ApiError } from '@/lib/api';
import type { NetEaseArtist } from '@/lib/server/netEase';
import ChromaGrid, { type ChromaItem } from '@/components/ui/reactbits/ChromaGrid';
import { Sparkles } from '@/components/ui/aceternity/sparkles';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingBlock, ErrorBlock } from '@/components/ui/StateViews';

const PAGE_SIZE = 30;

function toGridItems(artists: NetEaseArtist[]): ChromaItem[] {
  return artists.map((a) => ({
    image: a.avatar,
    title: a.name,
    subtitle: a.alias || (a.musicSize ? `${a.musicSize} 首作品` : '歌手'),
    borderColor: '#a855f7',
    gradient: 'linear-gradient(165deg, rgba(168,85,247,0.55), #0a0a1a)',
  }));
}

export default function SingerPage() {
  const router = useRouter();
  const [artists, setArtists] = useState<NetEaseArtist[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 歌手搜索
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NetEaseArtist[] | null>(null);

  const loadPage = useCallback(async (offset: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await fetchHotArtists(PAGE_SIZE, offset);
      setArtists((prev) => (append ? [...prev, ...res] : res));
      setHasMore(res.length >= PAGE_SIZE);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '歌手数据加载失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPage(0, false);
  }, [loadPage]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      setSearchResults(await searchArtists(q, 18));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const displayed = searchResults ?? artists;
  const gridItems = toGridItems(displayed);

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 relative">
      <Sparkles density={20} color="var(--color-primary)" className="opacity-15" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* 页面标题 + 搜索 */}
        <PageHeader
          title="热门歌手"
          subtitle="真实曲库歌手 · 点击进入歌手主页聆听"
          action={
            <form onSubmit={handleSearch} className="glass-panel px-4 py-2.5 flex items-center gap-2 w-64">
              <svg className="w-4 h-4 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索歌手..."
                className="bg-transparent text-sm text-white placeholder-white/40 w-full outline-none"
              />
              {searchResults && (
                <button
                  type="button"
                  onClick={() => {
                    setKeyword('');
                    setSearchResults(null);
                  }}
                  className="text-xs text-white/40 hover:text-white flex-shrink-0"
                >
                  ✕
                </button>
              )}
            </form>
          }
        />

        {error && <ErrorBlock message={error} onRetry={() => loadPage(0, false)} />}
        {loading && !error && <LoadingBlock label="正在加载歌手..." />}
        {searching && <LoadingBlock label="正在搜索歌手..." />}

        {!error && !loading && !searching && displayed.length === 0 && searchResults !== null && (
          <div className="text-center py-20 text-white/40">没有找到相关歌手</div>
        )}

        {/* 歌手墙（ChromaGrid，真实数据） */}
        {!error && !loading && displayed.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <ChromaGrid
              items={gridItems}
              onItemClick={(item) => {
                const hit = displayed.find((a) => a.name === item.title);
                if (hit) router.push(`/singer/${hit.id}`);
              }}
              radius={280}
            />
          </motion.div>
        )}

        {/* 加载更多（搜索结果不显示） */}
        {hasMore && !searchResults && !loading && !error && (
          <div className="flex justify-center mt-12">
            <button
              onClick={() => loadPage(artists.length, true)}
              className="px-6 py-3 rounded-xl text-sm bg-white/10 text-white hover:bg-white/15 transition-colors"
            >
              {loadingMore ? '加载中...' : '加载更多歌手'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
