'use client';

/**
 * 我的喜欢页 - 展示收藏歌曲（localStorage 持久化）
 * 空态引导用户去首页/搜索添加喜欢的歌。
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useMusicStore } from '@/lib/store';
import { songs, rankSongs, type Track } from '@/lib/data';
import { Sparkles } from '@/components/ui/aceternity/sparkles';
import ShinyText from '@/components/ui/reactbits/ShinyText';

// 从本地数据 + 榜单汇聚去重，作为"已收藏曲目"的查找池
const ALL_LOCAL: Track[] = (() => {
  const seen = new Map<number, Track>();
  for (const t of [...songs, ...rankSongs]) seen.set(t.id, t as Track);
  return Array.from(seen.values());
})();

export default function LikesPage() {
  const likedIds = useMusicStore((s) => s.likedIds);
  const play = useMusicStore((s) => s.play);
  const playQueueFrom = useMusicStore((s) => s.playQueueFrom);
  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);

  const likedTracks = useMemo(
    () => ALL_LOCAL.filter((t) => likedIds.includes(t.id)),
    [likedIds]
  );

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 relative">
      <Sparkles density={20} color="#f43f5e" className="opacity-15" />

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <ShinyText text="我的喜欢" speed={3} className="text-4xl font-bold" shineColor="#fda4af" color="#f43f5e" />
          <p className="text-white/50 mt-2">已收藏 {likedTracks.length} 首歌曲</p>
        </motion.div>

        {likedTracks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-16 text-center"
          >
            <div className="text-6xl mb-6">💗</div>
            <h2 className="text-2xl font-semibold text-white mb-3">还没有喜欢的歌曲</h2>
            <p className="text-white/50 mb-8">播放歌曲时点击底部 ♥ 即可收藏</p>
            <div className="flex items-center justify-center gap-4">
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
            </div>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {likedTracks.map((track, i) => {
              const isCurrent = currentSong?.id === track.id;
              const isPlayingThis = isCurrent && isPlaying;
              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => playQueueFrom(likedTracks, i)}
                  className={`glass-panel flex items-center gap-4 p-3 cursor-pointer transition-all group ${
                    isCurrent ? 'border-purple-400/40' : 'hover:border-white/20'
                  }`}
                >
                  <span className="w-6 text-center text-sm text-white/40 font-mono">{i + 1}</span>
                  <Image src={track.cover} alt={track.title} width={48} height={48} className="rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isCurrent ? 'text-purple-300' : 'text-white'}`}>
                      {track.title}
                    </p>
                    <p className="text-xs text-white/50 truncate">{track.artist}</p>
                  </div>
                  <button
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isPlayingThis ? 'bg-gradient-primary text-white' : 'bg-white/10 text-white/70 group-hover:bg-white/20'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isCurrent) useMusicStore.getState().togglePlay();
                      else play(track);
                    }}
                  >
                    {isPlayingThis ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
