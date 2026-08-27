'use client';

/**
 * 排行榜页（颠覆性重构版）
 * React Bits AnimatedList（滚动渐入榜单）+ CountUp（热度滚动）+ Aceternity Sparkles
 * 行点击 → playQueueFrom(rankSongs, index) 整列入队，保证 next/prev 在榜单内循环
 */
import { rankSongs, RankSong } from '@/lib/data';
import { useMusicStore } from '@/lib/store';
import { Sparkles } from '@/components/ui/aceternity/sparkles';
import AnimatedList from '@/components/ui/reactbits/AnimatedList';
import CountUp from '@/components/ui/reactbits/CountUp';
import ShinyText from '@/components/ui/reactbits/ShinyText';
import { motion } from 'framer-motion';

// 演示热度值：按排名递减
function heatOf(rank: number): number {
  return Math.round(9999 - (rank - 1) * 573);
}

export default function MusicTopPage() {
  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const playQueueFrom = useMusicStore((s) => s.playQueueFrom);

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 relative">
      <Sparkles density={20} color="#f59e0b" className="opacity-15" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-end justify-between"
        >
          <div>
            <ShinyText text="排行榜" speed={3} className="text-4xl font-bold" shineColor="#fde68a" color="#f59e0b" />
            <p className="text-white/50 mt-1">实时热门音乐排行 · 点击整榜入队播放</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-white/40">总热度</p>
            <CountUp to={87423} duration={2.5} separator="," className="text-2xl font-bold text-amber-400" />
          </div>
        </motion.div>

        {/* 排行榜列表（AnimatedList 渐入 + 键盘导航） */}
        <AnimatedList<RankSong>
          items={rankSongs}
          maxHeight="calc(100vh - 260px)"
          onItemSelect={(_, index) => playQueueFrom(rankSongs, index)}
          renderItem={(item, index, selected) => {
            const isCurrentSong = currentSong?.id === item.id;
            return (
              <div
                className={`
                  flex items-center gap-4 p-3 md:p-4 rounded-2xl
                  transition-all duration-300 group border
                  ${isCurrentSong
                    ? 'bg-white/10 border-purple-500/30 shadow-lg shadow-purple-500/10'
                    : selected
                      ? 'bg-white/5 border-white/10'
                      : 'border-transparent'
                  }
                `}
              >
                {/* 排名 */}
                <div
                  className={`
                    w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0
                    ${index < 3
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-white/10 text-white/60'
                    }
                  `}
                >
                  {item.rank}
                </div>

                {/* 封面 */}
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative">
                  <img
                    src={item.cover}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  {isCurrentSong && isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="flex items-end gap-0.5 h-4">
                        <div className="w-0.5 bg-purple-400 rounded-full animate-pulse" style={{ height: '60%' }} />
                        <div className="w-0.5 bg-purple-400 rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.15s' }} />
                        <div className="w-0.5 bg-purple-400 rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0.3s' }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* 歌曲信息 */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isCurrentSong ? 'text-purple-400' : 'text-white'}`}>
                    {item.title}
                  </p>
                  <p className="text-sm text-white/50 truncate">{item.artist}</p>
                </div>

                {/* 热度（CountUp 滚动） */}
                <div className="hidden md:flex flex-col items-end w-20">
                  <span className="text-xs text-white/30">热度</span>
                  <CountUp
                    to={heatOf(item.rank)}
                    duration={1.5}
                    delay={index * 0.05}
                    separator=","
                    className="text-sm font-semibold text-white/70"
                  />
                </div>

                {/* 时长 */}
                <span className="text-sm text-white/40 hidden md:block w-10 text-right">{item.duration}</span>

                {/* 播放图标 */}
                <div className="w-8 flex items-center justify-center">
                  {!isCurrentSong || !isPlaying ? (
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
