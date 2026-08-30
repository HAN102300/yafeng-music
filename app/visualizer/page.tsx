'use client';

/**
 * 可视化播放器页（沉浸剧场版）
 *
 * 布局重规划（解决底部拥挤/顶部空洞）：
 * - 本页独占全屏：Navbar 与底部 PlayerBar 在此路由自动隐藏（见各自组件）
 * - 顶部：自动隐藏栏 = 返回 + 场景 dock + BPM（dock 从底部上移，底部只留一个控制舱）
 * - 中央：封面圆环（点击切场景）+ 歌名/歌手 + 内嵌滚动歌词，垂直居中呼吸感布局
 * - 背景：所选场景即背景——
 *     · 全屏场景（流光频谱/粒子宇宙/星尘/丝弦/星际穿越）铺满视口
 *     · 中央场景（频谱）渲染为全宽贴底的「声景地平线」，顶部渐隐融入黑暗
 *     · 环形音浪即中央圆环本身
 * - 底部：唯一一个悬浮玻璃控制舱（进度 + 模式/上一首/播放/下一首/喜欢）
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusicStore } from '@/lib/store';
import { useAudioFrame } from '@/hooks/useAudioFrame';
import { useAudioProgress } from '@/hooks/useAudioProgress';
import { useDragPercent } from '@/hooks/useDragPercent';
import { useQualityTier } from '@/hooks/useQualityTier';
import { SCENES, getScene } from '@/lib/visualizer/registry';
import { SceneManager } from '@/components/visualizer/SceneManager';
import { FullBleedScene } from '@/components/visualizer/FullBleedScene';
import { CircularVisualizer } from '@/components/visualizer/CircularVisualizer';
import { LyricsScroller } from '@/components/player/LyricsScroller';
import { fetchHotChartTracks } from '@/lib/api';
import { toast } from '@/lib/toast';
import { formatTime } from '@/lib/format';

export default function VisualizerPage() {
  const router = useRouter();
  const quality = useQualityTier();

  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const next = useMusicStore((s) => s.next);
  const prev = useMusicStore((s) => s.prev);
  const playQueueFrom = useMusicStore((s) => s.playQueueFrom);
  const sceneId = useMusicStore((s) => s.visualizerSceneId);
  const setScene = useMusicStore((s) => s.setVisualizerScene);
  const playMode = useMusicStore((s) => s.playMode);
  const setPlayMode = useMusicStore((s) => s.setPlayMode);
  const liked = useMusicStore((s) => !!currentSong && s.isLiked(currentSong.id));
  const toggleLike = useMusicStore((s) => s.toggleLike);

  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 高频进度：本地 state
  const { currentTime, duration, seekTo } = useAudioProgress();
  const progressDrag = useDragPercent((pct) => seekTo(pct * duration));
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // BPM（2s 节流入 state）与节拍脉冲（直接操作 DOM，0 重渲染）
  const [bpm, setBpm] = useState(0);
  const bpmUpdateRef = useRef(0);
  const pulseRef = useRef(0);
  const beatScaleRef = useRef<HTMLDivElement>(null);
  const pulseBgRef = useRef<HTMLDivElement>(null);

  useAudioFrame((frame) => {
    let pulse = pulseRef.current * 0.92;
    if (frame.beat.isBeat) pulse = 1;
    pulseRef.current = pulse;

    if (beatScaleRef.current) {
      beatScaleRef.current.style.transform = `scale(${1 + pulse * 0.04})`;
    }
    if (pulseBgRef.current) {
      pulseBgRef.current.style.opacity = `${pulse * 0.35}`;
    }

    const now = performance.now();
    if (now - bpmUpdateRef.current > 2000) {
      bpmUpdateRef.current = now;
      setBpm(frame.beat.confidence > 0.3 ? frame.beat.bpm : 0);
    }
  });

  // 控制栏自动隐藏
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const handlePlayPause = async () => {
    if (!currentSong) {
      try {
        const tracks = await fetchHotChartTracks(30);
        if (tracks.length === 0) throw new Error('empty');
        playQueueFrom(tracks, 0);
      } catch {
        toast('在线曲库暂不可用，请稍后重试或先搜索歌曲', 'error');
      }
    } else {
      togglePlay();
    }
  };

  const cycleScene = () => {
    const idx = SCENES.findIndex((s) => s.id === sceneId);
    setScene(SCENES[(idx + 1) % SCENES.length].id);
  };

  const scene = getScene(sceneId);
  const isFullscreenScene = scene.placement === 'fullscreen';
  const currentModeLabel =
    playMode === 'single' ? '单曲循环' : playMode === 'random' ? '随机播放' : '列表循环';

  const { containerRef: progressContainerRef, isDragging: isProgressDragging } = progressDrag;

  return (
    <div
      className="fixed inset-0 z-[60] bg-[var(--color-dark-base)] overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* 节拍脉冲背景 */}
      <div
        ref={pulseBgRef}
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          opacity: 0,
          background:
            'radial-gradient(circle at 50% 45%, var(--glow-color, rgba(168,85,247,0.4)) 0%, transparent 60%)',
        }}
      />

      {/* ===== 背景可视化层 ===== */}
      {isFullscreenScene ? (
        <div className="absolute inset-0 z-[1] pointer-events-none">
          <SceneManager sceneId={sceneId} coverUrl={currentSong?.cover} quality={quality} backgroundOnly />
        </div>
      ) : (
        <>
          {/* 低环境辉光，避免纯黑呆板 */}
          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--color-primary) 12%, transparent) 0%, transparent 65%)',
            }}
          />
          {scene.id !== 'circular' && <FullBleedScene />}
        </>
      )}

      {/* ===== 顶部栏（自动隐藏）：返回 + 场景 dock + BPM ===== */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.35 }}
            className="absolute top-0 left-0 right-0 z-50 px-5 pt-5 flex items-center justify-between gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => router.back()}
              className="p-3 rounded-full bg-white/5 hover:bg-white/15 backdrop-blur-md border border-white/10 transition-colors flex-shrink-0"
              title="返回"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </motion.button>

            {/* 场景 dock（顶部胶囊，横向可滚动） */}
            <div className="flex-1 min-w-0 flex justify-center overflow-x-auto scrollbar-hide">
              <div className="flex gap-1.5 p-1.5 rounded-full bg-white/[0.04] backdrop-blur-xl border border-white/10">
                {SCENES.map((s) => (
                  <motion.button
                    key={s.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setScene(s.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                      sceneId === s.id
                        ? 'bg-white/15 text-white border-white/25'
                        : 'bg-transparent text-white/45 border-transparent hover:text-white/80'
                    }`}
                  >
                    <span className="mr-1">{s.icon}</span>
                    {s.name}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* BPM */}
            <div className="flex-shrink-0 w-[72px] flex justify-end">
              {bpm > 0 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-xs text-white/60 tabular-nums"
                >
                  {bpm} BPM
                </motion.span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 中央内容：圆环 + 歌名 + 滚动歌词 ===== */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 pb-28 pt-20">
        {/* 封面圆环（点击切换场景） */}
        <div ref={beatScaleRef} className="will-change-auto">
          <div className="relative flex items-center justify-center cursor-pointer" onClick={cycleScene}>
            <CircularVisualizer size={270} showCover coverUrl={currentSong?.cover} />
          </div>
        </div>

        {/* 歌名 / 歌手 */}
        <div className="mt-7 text-center max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg leading-snug break-words">
            {currentSong?.title ?? '选一首歌，让音乐看得见'}
          </h1>
          <p className="text-lg text-white/60 mt-2">{currentSong?.artist ?? '雅枫音乐 · 沉浸式可视化'}</p>
        </div>

        {/* 内嵌滚动歌词（融入背景，无浮层边框） */}
        <LyricsScroller
          lyricUrl={currentSong?.lyricUrl}
          neteaseId={currentSong?.neteaseId}
          height={190}
          lineHeight={46}
          className="mt-4 w-full max-w-2xl"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: showControls ? 0.35 : 0 }}
          transition={{ duration: 0.5 }}
          className="mt-1 text-xs text-white/60"
        >
          点击圆环切换场景 · 点击歌词跳转播放位置
        </motion.p>
      </div>

      {/* ===== 底部控制舱（唯一控制区） ===== */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 36 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="absolute bottom-0 left-0 right-0 z-50 px-5 pb-7 flex justify-center"
          >
            <div
              className="w-full max-w-2xl rounded-3xl border border-white/10 backdrop-blur-2xl px-6 pt-4 pb-5"
              style={{
                background: 'color-mix(in srgb, var(--color-dark-base) 72%, transparent)',
                boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
              }}
            >
              {/* 进度 */}
              <div
                ref={progressContainerRef}
                className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer relative group select-none touch-none"
                {...progressDrag.start}
              >
                <div
                  className="h-full rounded-full relative"
                  style={{
                    width: `${isProgressDragging ? progressDrag.percent * 100 : progressPercent}%`,
                    background:
                      'linear-gradient(90deg, var(--color-primary, #a855f7), var(--color-accent, #06b6d4))',
                    boxShadow: '0 0 12px color-mix(in srgb, var(--color-primary) 55%, transparent)',
                  }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="flex justify-between text-xs text-white/40 mt-2 tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* 控制键 */}
              <div className="flex items-center justify-center gap-7 mt-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPlayMode(playMode === 'loop' ? 'single' : playMode === 'single' ? 'random' : 'loop')}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white text-lg"
                  title={currentModeLabel}
                >
                  {playMode === 'single' ? '🔂' : playMode === 'random' ? '🔀' : '🔁'}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={prev}
                  className="p-3 rounded-full hover:bg-white/10 transition-colors"
                  title="上一首"
                >
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={handlePlayPause}
                  className="p-6 rounded-full transition-all"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary, #a855f7), var(--color-accent, #06b6d4))',
                    boxShadow: '0 0 34px color-mix(in srgb, var(--color-primary) 45%, transparent)',
                  }}
                  title={isPlaying ? '暂停' : '播放'}
                >
                  {isPlaying ? (
                    <svg className="w-8 h-8 text-white on-accent" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-white on-accent ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={next}
                  className="p-3 rounded-full hover:bg-white/10 transition-colors"
                  title="下一首"
                >
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => currentSong && toggleLike(currentSong)}
                  className={`p-2 rounded-full hover:bg-white/10 transition-colors ${liked ? 'text-red-400' : 'text-white/50 hover:text-white'}`}
                  title={liked ? '取消喜欢' : '喜欢'}
                >
                  <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
