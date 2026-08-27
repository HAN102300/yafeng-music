'use client';

/**
 * 首页（颠覆性重构版）
 * React Bits (Aurora/SplitText/TiltedCard/ShinyText) + Aceternity (TextGenerateEffect/BentoGrid/GlowingButton)
 * - 无内嵌可视化模式：「进入可视化」直接路由 /visualizer
 * - 「正在播放」卡片绑定全局引擎（迷你环形可视化）
 */
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { songs, playlists, artists, Track } from '@/lib/data';
import { useMusicStore } from '@/lib/store';
import { useQualityTier } from '@/hooks/useQualityTier';
import SplitText from '@/components/ui/reactbits/SplitText';
import TiltedCard from '@/components/ui/reactbits/TiltedCard';
import ShinyText from '@/components/ui/reactbits/ShinyText';
import { TextGenerateEffect } from '@/components/ui/aceternity/text-generate-effect';
import { GlowingButton } from '@/components/ui/aceternity/glowing-button';
import { Sparkles } from '@/components/ui/aceternity/sparkles';
import { CircularVisualizer } from '@/components/visualizer/CircularVisualizer';

// ogl WebGL 背景：懒加载 + 禁 SSR
const Aurora = dynamic(() => import('@/components/ui/reactbits/Aurora'), { ssr: false });

export default function HomePage() {
  const router = useRouter();
  const quality = useQualityTier();

  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const play = useMusicStore((s) => s.play);
  const playQueueFrom = useMusicStore((s) => s.playQueueFrom);

  const handleStartListening = () => {
    playQueueFrom(songs, 0);
  };

  const handlePlaySong = (song: Track) => {
    play(song);
  };

  return (
    <div className="min-h-screen relative">
      {/* ===== Hero 区 ===== */}
      <section className="relative h-[72vh] min-h-[520px] flex flex-col items-center justify-center overflow-hidden">
        {/* Aurora 背景（low 档降级为静态渐变） */}
        <div className="absolute inset-0 -z-10">
          {quality === 'low' ? (
            <div
              className="w-full h-full"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 0%, rgba(82,39,255,0.35) 0%, rgba(12,12,29,0) 60%)',
              }}
            />
          ) : (
            <Aurora colorStops={['#5227FF', '#a855f7', '#ec4899']} amplitude={1.1} blend={0.55} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-transparent to-transparent" />
        </div>

        {quality === 'high' && <Sparkles density={30} color="#a5b4fc" className="opacity-40" />}

        {/* 标题 */}
        <SplitText
          text="雅枫音乐"
          tag="h1"
          delay={90}
          duration={0.9}
          className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-white to-pink-300 drop-shadow-2xl"
        />
        <TextGenerateEffect
          words="让 音 乐 看 得 见"
          className="text-xl md:text-2xl text-white/70 mt-2 text-center"
        />

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-4 mt-10"
        >
          <GlowingButton size="lg" onClick={handleStartListening}>
            🎧 开始聆听
          </GlowingButton>
          <GlowingButton size="lg" variant="secondary" onClick={() => router.push('/visualizer')}>
            🌌 进入可视化
          </GlowingButton>
        </motion.div>

        {/* 滚动提示 */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="absolute bottom-6 text-white/30 text-2xl"
        >
          ↓
        </motion.div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        {/* ===== 正在播放（绑定全局引擎） ===== */}
        {currentSong && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <div
              className="relative flex flex-col md:flex-row items-center gap-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 md:p-8 overflow-hidden"
              style={{ boxShadow: isPlaying ? 'var(--glow-primary, none)' : 'none' }}
            >
              <div className="shrink-0">
                <CircularVisualizer size={180} showCover coverUrl={currentSong.cover} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-2">
                  {isPlaying ? 'Now Playing · 正在播放' : '已暂停'}
                </p>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-1">{currentSong.title}</h3>
                <p className="text-white/60">{currentSong.artist}</p>
                <div className="mt-5 flex flex-wrap justify-center md:justify-start gap-3">
                  <GlowingButton size="sm" onClick={() => router.push('/visualizer')}>
                    进入沉浸式可视化 →
                  </GlowingButton>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* ===== 推荐歌曲（TiltedCard） ===== */}
        <section className="mb-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <ShinyText text="推荐歌曲" speed={3} className="text-3xl font-bold" shineColor="#e9d5ff" color="#a78bfa" />
              <p className="text-white/40 text-sm mt-1">点击卡片即刻播放</p>
            </div>
            <button
              onClick={() => router.push('/musictop')}
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              查看排行 →
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {songs.map((song, index) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (index % 4) * 0.08 }}
              >
                <TiltedCard
                  imageSrc={song.cover}
                  altText={song.title}
                  captionText={`${song.title} - ${song.artist}`}
                  containerWidth="100%"
                  containerHeight="220px"
                  imageWidth="100%"
                  imageHeight="220px"
                  rotateAmplitude={10}
                  scaleOnHover={1.06}
                  displayOverlayContent
                  onClick={() => handlePlaySong(song)}
                  overlayContent={
                    <div className="flex items-end justify-between rounded-b-[15px] bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-10 w-full">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{song.title}</p>
                        <p className="text-white/60 text-xs truncate">{song.artist}</p>
                      </div>
                      <div className="w-9 h-9 shrink-0 rounded-full bg-purple-500/90 flex items-center justify-center shadow-lg shadow-purple-500/40">
                        {currentSong?.id === song.id && isPlaying ? (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </div>
                    </div>
                  }
                />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== 歌单精选（Bento 布局） ===== */}
        <section className="mb-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <ShinyText text="歌单精选" speed={3} className="text-3xl font-bold" shineColor="#fbcfe8" color="#f472b6" />
              <p className="text-white/40 text-sm mt-1">为每个心情准备一份歌单</p>
            </div>
            <button
              onClick={() => router.push('/songlist')}
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              全部歌单 →
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[10rem] gap-4">
            {playlists.slice(0, 6).map((playlist, index) => (
              <motion.div
                key={playlist.id}
                initial={{ opacity: 0, scale: 0.94 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push('/songlist')}
                className={`group relative rounded-2xl overflow-hidden border border-white/10 cursor-pointer ${
                  index === 0 || index === 3 ? 'md:col-span-2' : ''
                }`}
              >
                <img
                  src={playlist.cover}
                  alt={playlist.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-semibold">{playlist.name}</h3>
                  <p className="text-white/50 text-xs mt-0.5">{playlist.count} 首歌曲</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== 热门歌手 ===== */}
        <section className="mb-20">
          <div className="flex items-end justify-between mb-6">
            <div>
              <ShinyText text="热门歌手" speed={3} className="text-3xl font-bold" shineColor="#a5f3fc" color="#22d3ee" />
              <p className="text-white/40 text-sm mt-1">发现你喜爱的音乐人</p>
            </div>
            <button
              onClick={() => router.push('/singer')}
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              全部歌手 →
            </button>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-4 [&::-webkit-scrollbar]:h-[6px] [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
            {artists.slice(0, 12).map((artist, index) => (
              <motion.div
                key={artist.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.03 }}
                onClick={() => router.push('/singer')}
                className="group flex flex-col items-center shrink-0 cursor-pointer"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-purple-400 transition-all">
                  <img
                    src={artist.avatar}
                    alt={artist.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <p className="text-xs text-white/60 group-hover:text-white mt-2 transition-colors">
                  {artist.name}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
