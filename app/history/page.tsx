'use client';

/**
 * 最近在听页：播放历史（本地持久化，上限 100 首）
 */
import Link from 'next/link';
import { useMusicStore } from '@/lib/store';
import { Sparkles } from '@/components/ui/aceternity/sparkles';
import { PageHeader } from '@/components/ui/PageHeader';
import { TrackList } from '@/components/ui/TrackList';
import { EmptyBlock } from '@/components/ui/StateViews';

export default function HistoryPage() {
  const history = useMusicStore((s) => s.history);
  const clearHistory = useMusicStore((s) => s.clearHistory);

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 relative">
      <Sparkles density={20} color="var(--color-primary)" className="opacity-15" />

      <div className="max-w-5xl mx-auto relative z-10">
        <PageHeader
          title="最近在听"
          subtitle={`共 ${history.length} 首播放记录`}
          action={history.length > 0 && (
            <button
              onClick={clearHistory}
              className="px-4 py-2 rounded-xl text-sm glass-panel text-white/50 hover:text-red-300 transition-colors"
            >
              🗑 清空记录
            </button>
          )}
        />

        {history.length === 0 ? (
          <EmptyBlock icon="🕒" title="还没有播放记录" desc="播放的歌曲会自动出现在这里">
            <Link
              href="/"
              className="px-6 py-3 rounded-full bg-gradient-primary text-white font-medium hover:opacity-90 transition-opacity"
            >
              去首页听歌
            </Link>
            <Link
              href="/musictop"
              className="px-6 py-3 rounded-full glass-panel text-white font-medium hover:bg-white/10 transition-colors"
            >
              看看排行榜
            </Link>
          </EmptyBlock>
        ) : (
          <>
            <div className="flex justify-end mb-3">
              <button
                onClick={() => useMusicStore.getState().playQueueFrom(history, 0)}
                className="px-4 py-2 rounded-xl text-sm bg-gradient-primary text-white hover:opacity-90 transition-opacity"
              >
                ▶ 播放全部
              </button>
            </div>
            <TrackList tracks={history} />
          </>
        )}
      </div>
    </div>
  );
}
