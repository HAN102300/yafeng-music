'use client';

/**
 * 歌手列表页（颠覆性重构版）
 * React Bits ChromaGrid 歌手墙（光标去灰阶 + 聚光）+ Aceternity Card3D 焦点歌手
 * 点击歌手 → 过滤其歌曲入队播放（无对应曲目则播放全部推荐）
 */
import { artists, songs } from '@/lib/data';
import { useMusicStore } from '@/lib/store';
import { Card3D } from '@/components/ui/aceternity/3d-card';
import { Sparkles } from '@/components/ui/aceternity/sparkles';
import ChromaGrid, { ChromaItem } from '@/components/ui/reactbits/ChromaGrid';
import ShinyText from '@/components/ui/reactbits/ShinyText';
import { motion } from 'framer-motion';

// 流派 → 主题色
const GENRE_COLORS: Record<string, { border: string; gradient: string }> = {
  流行: { border: '#a855f7', gradient: 'linear-gradient(165deg, rgba(168,85,247,0.55), #0a0a1a)' },
  摇滚: { border: '#ef4444', gradient: 'linear-gradient(195deg, rgba(239,68,68,0.55), #0a0a1a)' },
  独立: { border: '#10b981', gradient: 'linear-gradient(210deg, rgba(16,185,129,0.55), #0a0a1a)' },
  国风: { border: '#f59e0b', gradient: 'linear-gradient(145deg, rgba(245,158,11,0.55), #0a0a1a)' },
};

export default function SingerPage() {
  const playQueueFrom = useMusicStore((s) => s.playQueueFrom);

  const gridItems: ChromaItem[] = artists.map((artist) => ({
    image: artist.avatar,
    title: artist.name,
    subtitle: artist.genre,
    borderColor: GENRE_COLORS[artist.genre]?.border ?? '#a855f7',
    gradient: GENRE_COLORS[artist.genre]?.gradient ?? GENRE_COLORS['流行'].gradient,
  }));

  // 点击歌手：有其曲目则整列入队，否则播放全部推荐
  const handleArtistClick = (item: ChromaItem) => {
    const matched = songs.filter((s) => s.artist.includes(item.title));
    if (matched.length > 0) {
      playQueueFrom(matched, 0);
    } else {
      playQueueFrom(songs, 0);
    }
  };

  const featured = artists[2]; // 邓紫棋（有真实曲目）

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 relative">
      <Sparkles density={20} color="#ec4899" className="opacity-15" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <ShinyText text="热门歌手" speed={3} className="text-4xl font-bold" shineColor="#fbcfe8" color="#ec4899" />
          <p className="text-white/50 mt-1">发现你喜爱的音乐人 · 点击歌手即刻聆听</p>
        </motion.div>

        {/* 焦点歌手（Card3D） */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-12 max-w-xl"
        >
          <Card3D containerClassName="w-full" glareEnabled>
            <div
              className="flex items-center gap-6 p-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md cursor-pointer hover:border-pink-500/40 transition-colors"
              onClick={() => handleArtistClick({ image: featured.avatar, title: featured.name, subtitle: featured.genre })}
            >
              <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-pink-500/60 shrink-0">
                <img src={featured.avatar} alt={featured.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-pink-400/80 mb-1">本周焦点</p>
                <h2 className="text-2xl font-bold text-white">{featured.name}</h2>
                <p className="text-white/50 text-sm mt-1">{featured.genre} · 点击播放代表作</p>
              </div>
            </div>
          </Card3D>
        </motion.div>

        {/* 歌手墙（ChromaGrid） */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <ChromaGrid items={gridItems} onItemClick={handleArtistClick} radius={280} />
        </motion.div>
      </div>
    </div>
  );
}
