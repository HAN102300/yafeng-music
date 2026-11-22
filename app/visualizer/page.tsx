'use client';

/**
 * 可视化播放器页（沉浸剧场版）
 *
 * 布局重规划（解决底部拥挤/顶部空洞）：
 * - 本页独占全屏：Navbar 与底部 PlayerBar 在此路由自动隐藏（见各自组件）
 * - 顶部：自动隐藏栏 = 返回 + 场景 dock + BPM（dock 从底部上移，底部只留一个控制舱）
 * - 中央：封面圆环（点击切场景）+ 歌名/歌手 + 内嵌滚动歌词，垂直居中呼吸感布局
 * - 背景：所选场景即背景——七个场景统一为一层全屏背景（流光频谱/环形光晕/声景地平线/
 *     粒子宇宙/星尘/丝弦/星际穿越），由 SceneManager 互斥挂载
 * - 底部：唯一一个悬浮玻璃控制舱（进度 + 模式/上一首/播放/下一首/喜欢）
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusicStore } from '@/lib/store';
import { useAudioFrame } from '@/hooks/useAudioFrame';
import { useVisualizerQuality } from '@/hooks/useVisualizerQuality';
import { SCENES } from '@/lib/visualizer/registry';
import { SceneManager } from '@/components/visualizer/SceneManager';
import { CircularVisualizer } from '@/components/visualizer/CircularVisualizer';
import { LyricsScroller } from '@/components/player/LyricsScroller';
import { VisualizerDock } from '@/components/player/VisualizerDock';
import { fetchHotChartTracks } from '@/lib/api';
import { toast } from '@/lib/toast';

export default function VisualizerPage() {
  const router = useRouter();
  const { quality } = useVisualizerQuality();

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

  // 无歌时 Dock 播放键触发：自动开播热歌榜
  useEffect(() => {
    const onPlayPause = () => {
      if (currentSong) togglePlay();
      else void handlePlayPause();
    };
    document.addEventListener('yafeng:viz-playpause', onPlayPause);
    return () => document.removeEventListener('yafeng:viz-playpause', onPlayPause);
  });

  const handlePlayPause = async () => {
    if (!currentSong) {
      try {
        const tracks = await fetchHotChartTracks(30);
        if (tracks.length === 0) throw new Error('empty');
        playQueueFrom(tracks, 0);
        toast('已为你播放热歌榜 🎵', 'success');
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

      {/* ===== 背景可视化层（每个场景都是一层全屏背景） ===== */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <SceneManager sceneId={sceneId} coverUrl={currentSong?.cover} quality={quality} />
      </div>

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

      {/* ===== 中央内容：左（圆环）右（歌名+歌词）双栏 ===== */}
      <div className="relative z-10 h-full flex flex-col lg:flex-row items-center justify-center lg:justify-center gap-[3vh] lg:gap-14 px-6 pt-20 pb-[max(76px,calc(env(safe-area-inset-bottom,0px)+76px))] viz-center">
        {/* 左：封面圆环（点击切换场景） */}
        <div ref={beatScaleRef} className="will-change-auto ring-wrap shrink-0">
          <div className="relative flex items-center justify-center cursor-pointer" onClick={cycleScene}>
            <CircularVisualizer size={260} showCover coverUrl={currentSong?.cover} />
          </div>
        </div>

        {/* 右：歌名/歌手 + 歌词（页面主体，占最高） */}
        <div className="flex flex-col items-center lg:items-start justify-center w-full lg:w-auto lg:flex-1 lg:max-w-2xl min-w-0 gap-2 viz-right">
          <div className="text-center lg:text-left max-w-full">
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg leading-snug break-words">
              {currentSong?.title ?? '选一首歌，让音乐看得见'}
            </h1>
            <p className="text-lg text-white/60 mt-2">{currentSong?.artist ?? '雅枫音乐 · 沉浸式可视化'}</p>
          </div>

          {/* 内嵌滚动歌词（flex 分配高度 + 上下限约束） */}
          <LyricsScroller
            neteaseId={currentSong?.neteaseId}
            lineHeight={46}
            className="w-full viz-lyrics flex-1 min-h-[140px] max-h-[42vh]"
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: showControls ? 0.35 : 0 }}
            transition={{ duration: 0.5 }}
            className="text-xs text-white/60 text-center lg:text-left"
          >
            点击圆环切换场景 · 点击歌词跳转播放位置
          </motion.p>
        </div>
      </div>

      {/* ===== 底部控制舱（唯一控制区） ===== */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 36 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="absolute bottom-0 left-0 right-0 z-50 px-4 pb-[max(20px,env(safe-area-inset-bottom,0px))] flex justify-center"
          >
            <VisualizerDock onActivity={handleMouseMove} hasSong={!!currentSong} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
