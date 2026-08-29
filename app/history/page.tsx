'use client';

/**
 * 最近在听页：播放历史（本地持久化，上限 100 首）
 */
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMusicStore } from '@/lib/store';
import { Sparkles } from '@/components/ui/aceternity/sparkles';
import ShinyText from '@/components/ui/reactbits/ShinyText';
import { TrackList } from '@/components/ui/TrackList';
import { EmptyBlock } from '@/components/ui/StateViews';

export default function HistoryPage() {
  const history = useMusicStore((s) => s.history);
  const clearHistory = useMusicStore((s) => s.clearHistory);

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 relative">
      <Sparkles density={20} color="#818cf8" className="opacity-15" />

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-end justify-between flex-wrap gap-3"
        >
          <div>
            <ShinyText text="最近在听" speed={3} className="text-4xl font-bold" shineColor="#c7d2fe" color="#818cf8" />
            <p className="text-white/50 mt-2">共 {history.length} 首播放记录</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="px-4 py-2 rounded-xl text-sm glass-panel text-white/50 hover:text-red-300 transition-colors"
            >
              🗑 清空记录
            </button>
          )}
        </motion.div>

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
