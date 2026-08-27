'use client';

/**
 * 歌单列表页（颠覆性重构版）
 * React Bits SpotlightCard 网格 + Aceternity GlowingButton 分类 chips
 * 分类筛选真实生效（本地 state）；点击歌单 → 推荐曲目入队播放
 */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { playlists, songs } from '@/lib/data';
import { useMusicStore } from '@/lib/store';
import Image from 'next/image';
import { Sparkles } from '@/components/ui/aceternity/sparkles';
import { GlowingButton } from '@/components/ui/aceternity/glowing-button';
import SpotlightCard from '@/components/ui/reactbits/SpotlightCard';
import ShinyText from '@/components/ui/reactbits/ShinyText';

// 歌单 id → 分类（数据层无分类字段，这里维护展示用映射）
const PLAYLIST_CATEGORY: Record<number, string> = {
  1: '国风',
  2: '欧美',
  3: '治愈',
  4: '电子',
  5: '流行',
  6: '治愈',
  7: '怀旧',
  8: '电子',
  9: '流行',
  10: '治愈',
  11: '欧美',
  12: '治愈',
};

const categories = ['全部', '国风', '欧美', '电子', '流行', '治愈', '怀旧'];

export default function SongListPage() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const playQueueFrom = useMusicStore((s) => s.playQueueFrom);

  const filtered = useMemo(
    () =>
      activeCategory === '全部'
        ? playlists
        : playlists.filter((p) => PLAYLIST_CATEGORY[p.id] === activeCategory),
    [activeCategory]
  );

  // 点击歌单：以其 id 为起点将推荐曲目入队（演示数据无歌单曲目映射）
  const handlePlayPlaylist = (playlistId: number) => {
    playQueueFrom(songs, playlistId % songs.length);
  };

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 relative">
      <Sparkles density={25} color="#8b5cf6" className="opacity-20" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <ShinyText text="歌单广场" speed={3} className="text-4xl font-bold" shineColor="#ddd6fe" color="#8b5cf6" />
          <p className="text-white/50 mt-1">发现属于你的音乐合集</p>
        </motion.div>

        {/* 分类标签（真实筛选） */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 mb-8"
        >
          {categories.map((cat) => (
            <GlowingButton
              key={cat}
              variant={activeCategory === cat ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </GlowingButton>
          ))}
        </motion.div>

        {/* 歌单网格（SpotlightCard） */}
        <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((playlist, index) => (
              <motion.div
                key={playlist.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ delay: index * 0.04 }}
              >
                <SpotlightCard
                  className="p-3 cursor-pointer group h-full"
                  spotlightColor="rgba(139, 92, 246, 0.25)"
                  onClick={() => handlePlayPlaylist(playlist.id)}
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                    <Image
                      src={playlist.cover}
                      alt={playlist.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white/80 border border-white/10">
                      {PLAYLIST_CATEGORY[playlist.id]}
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white/90 border border-white/10">
                      {playlist.count}首
                    </div>
                    {/* 播放按钮 */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-purple-500/80 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-sm text-white/80 truncate font-medium group-hover:text-white transition-colors">
                    {playlist.name}
                  </h3>
                  <p className="text-xs text-white/40 mt-1">{playlist.count}首歌曲</p>
                </SpotlightCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* 空态 */}
        {filtered.length === 0 && (
          <div className="text-center py-20 text-white/40">该分类下暂无歌单</div>
        )}
      </div>
    </div>
  );
}
