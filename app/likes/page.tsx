'use client';

/**
 * 我的喜欢页（API 化重构版）
 * 收藏数据为完整 Track 快照（likedTracks），本地/在线歌都能恢复展示。
 */
import Link from 'next/link';
import { useMusicStore } from '@/lib/store';
import { Sparkles } from '@/components/ui/aceternity/sparkles';
import { PageHeader } from '@/components/ui/PageHeader';
import { TrackList } from '@/components/ui/TrackList';
import { EmptyBlock } from '@/components/ui/StateViews';

export default function LikesPage() {
  const likedTracks = useMusicStore((s) => s.likedTracks);

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 relative">
      <Sparkles density={20} color="var(--color-primary)" className="opacity-15" />

      <div className="max-w-5xl mx-auto relative z-10">
        <PageHeader title="我的喜欢" subtitle={`已收藏 ${likedTracks.length} 首歌曲`} />

        {likedTracks.length === 0 ? (
          <EmptyBlock icon="💗" title="还没有喜欢的歌曲" desc="在任意歌曲行或播放条点击 ♥ 即可收藏">
            <Link
              href="/"
              className="px-6 py-3 rounded-full bg-gradient-primary text-white font-medium hover:opacity-90 transition-opacity"
            >
              去首页听歌
            </Link>
            <Link
              href="/search"
              className="px-6 py-3 rounded-full glass-panel text-white font-medium hover:bg-white/10 transition-colors"
            >
              搜索音乐
            </Link>
          </EmptyBlock>
        ) : (
          <>
            <div className="flex justify-end mb-3">
              <button
                onClick={() => useMusicStore.getState().playQueueFrom(likedTracks, 0)}
                className="px-4 py-2 rounded-xl text-sm bg-gradient-primary text-white hover:opacity-90 transition-opacity"
              >
                ▶ 播放全部
              </button>
            </div>
            <TrackList tracks={likedTracks} />
          </>
        )}
      </div>
    </div>
  );
}
