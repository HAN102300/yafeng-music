'use client';

/**
 * 可视化播放器页面（颠覆性重构版）
 * - 无本地 audio：全部读写全局 store / audioEngine（跨页面持续播放）
 * - 场景由注册表 SCENES 驱动，SceneManager 保证全屏 WebGL 互斥
 * - 节拍脉冲经 useAudioFrame 直接操作 DOM，0 每帧重渲染
 * - 歌词同步（LyricsPanel）+ BPM 显示（2s 节流）
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { songs } from '@/lib/data';
import { useMusicStore } from '@/lib/store';
import { audioEngine } from '@/lib/audio/engine';
import { useAudioFrame } from '@/hooks/useAudioFrame';
import { useQualityTier } from '@/hooks/useQualityTier';
import { SCENES } from '@/lib/visualizer/registry';
import { SceneManager } from '@/components/visualizer/SceneManager';
import { LyricsPanel } from '@/components/player/LyricsPanel';
import { AuroraBackground } from '@/components/ui/aceternity/aurora-background';

export default function VisualizerPage() {
  const router = useRouter();
  const quality = useQualityTier();

  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const next = useMusicStore((s) => s.next);
  const prev = useMusicStore((s) => s.prev);
  const seekTo = useMusicStore((s) => s.seekTo);
  const playQueueFrom = useMusicStore((s) => s.playQueueFrom);
  const sceneId = useMusicStore((s) => s.visualizerSceneId);
  const setScene = useMusicStore((s) => s.setVisualizerScene);

  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 高频显示状态：本页局部（timeupdate ~4Hz）
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioEngine.getAudio();
    if (!audio) return;

    const handleTime = () => setCurrentTime(audio.currentTime);
    const handleDuration = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    handleTime();
    handleDuration();

    audio.addEventListener('timeupdate', handleTime);
    audio.addEventListener('loadedmetadata', handleDuration);
    audio.addEventListener('durationchange', handleDuration);
    return () => {
      audio.removeEventListener('timeupdate', handleTime);
      audio.removeEventListener('loadedmetadata', handleDuration);
      audio.removeEventListener('durationchange', handleDuration);
    };
  }, []);

  // BPM（2s 节流入 state）与节拍脉冲（直接操作 DOM，0 重渲染）
  const [bpm, setBpm] = useState(0);
  const bpmUpdateRef = useRef(0);
  const pulseRef = useRef(0);
  const beatScaleRef = useRef<HTMLDivElement>(null);
  const pulseBgRef = useRef<HTMLDivElement>(null);

  useAudioFrame((frame) => {
    // 脉冲衰减 + 节拍触发
    let pulse = pulseRef.current * 0.92;
    if (frame.beat.isBeat) pulse = 1;
    pulseRef.current = pulse;

    if (beatScaleRef.current) {
      beatScaleRef.current.style.transform = `scale(${1 + pulse * 0.04})`;
    }
    if (pulseBgRef.current) {
      pulseBgRef.current.style.opacity = `${pulse * 0.35}`;
    }

    // BPM 低频更新
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
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const handlePlayPause = () => {
    if (!currentSong) {
      playQueueFrom(songs, 0);
    } else {
      togglePlay();
    }
  };

  const cycleScene = () => {
    const idx = SCENES.findIndex((s) => s.id === sceneId);
    setScene(SCENES[(idx + 1) % SCENES.length].id);
  };

  const formatTime = (time: number): string => {
    if (!isFinite(time) || time < 0) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[60] bg-[#0a0a1a]" onMouseMove={handleMouseMove}>
      <AuroraBackground className="h-full min-h-0" radialGradient>
        {/* 节拍脉冲背景（DOM 直改 opacity） */}
        <div
          ref={pulseBgRef}
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            opacity: 0,
            background:
              'radial-gradient(circle at 50% 50%, var(--glow-color, rgba(168,85,247,0.4)) 0%, transparent 60%)',
          }}
        />

        {/* 返回按钮 */}
        <AnimatePresence>
          {showControls && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => router.back()}
              className="absolute top-6 left-6 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* 主内容区 */}
        <div className="relative z-10 flex flex-col items-center justify-center h-screen px-8">
          {/* 可视化区域（点击切换场景，节拍缩放走 DOM 直改） */}
          <div ref={beatScaleRef} className="will-change-transform">
            <div className="relative flex items-center justify-center cursor-pointer" onClick={cycleScene}>
              <SceneManager sceneId={sceneId} coverUrl={currentSong?.cover} quality={quality} />
            </div>
          </div>

          {/* 歌曲信息 */}
          <div className="mt-6 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 drop-shadow-lg">
              {currentSong?.title ?? '选一首歌，让音乐看得见'}
            </h1>
            <p className="text-lg text-white/70">{currentSong?.artist ?? '雅枫音乐 · 沉浸式可视化'}</p>
          </div>

          {/* 歌词同步 */}
          <LyricsPanel lyricUrl={currentSong?.lyricUrl} neteaseId={currentSong?.neteaseId} className="mt-4" />

          {/* BPM 显示 */}
          {bpm > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10"
            >
              <span className="text-sm text-white/60">{bpm} BPM</span>
            </motion.div>
          )}

          {/* 提示文字 */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-4 text-xs text-white/30"
          >
            点击可视化区域切换场景
          </motion.p>
        </div>

        {/* 底部控制栏 */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="absolute bottom-0 left-0 right-0 p-6 z-50"
            >
              <div className="max-w-2xl mx-auto">
                {/* 进度条 */}
                <div className="mb-4">
                  <div
                    className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer relative group"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const time = ((e.clientX - rect.left) / rect.width) * duration;
                      seekTo(time);
                      setCurrentTime(time);
                    }}
                  >
                    <div
                      className="h-full rounded-full relative"
                      style={{
                        width: `${progressPercent}%`,
                        background:
                          'linear-gradient(90deg, var(--color-primary, #a855f7), var(--color-accent, #06b6d4))',
                      }}
                    >
                      <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white"
                        style={{ boxShadow: 'var(--glow-primary, 0 0 10px rgba(168,85,247,0.4))' }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-white/40 mt-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* 播放控制 */}
                <div className="flex items-center justify-center gap-6">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={prev}
                    className="p-3 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                    </svg>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handlePlayPause}
                    className="p-5 rounded-full transition-all"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-primary, #a855f7), var(--color-accent, #06b6d4))',
                      boxShadow: 'var(--glow-primary, 0 0 30px rgba(168,85,247,0.4))',
                    }}
                  >
                    {isPlaying ? (
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={next}
                    className="p-3 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                  </motion.button>
                </div>

                {/* 场景切换（由注册表渲染） */}
                <div className="flex flex-wrap justify-center gap-2 mt-5">
                  {SCENES.map((scene) => (
                    <motion.button
                      key={scene.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setScene(scene.id)}
                      className={`px-4 py-2 rounded-full text-xs font-medium transition-all backdrop-blur-sm border ${
                        sceneId === scene.id
                          ? 'bg-white/20 text-white border-white/30 shadow-lg'
                          : 'bg-white/5 text-white/50 border-white/10 hover:text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <span className="mr-1">{scene.icon}</span>
                      {scene.name}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </AuroraBackground>
    </div>
  );
}
