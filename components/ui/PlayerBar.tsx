'use client';

/**
 * 底部播放控制栏（重构版）
 * 音频元素归 audioEngine 所有；本组件只发 store 指令、读音频事件。
 * - 可隐藏：收起后右下角显示 mini 悬浮播放器（旋转封面+播放/暂停+展开）
 * - 歌词浮层、可视化入口；氛围色跟随封面主色（--cover-color）
 * - currentTime/duration 由 useAudioProgress 提供；进度/音量拖拽由 useDragPercent 驱动
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useMusicStore, type PlayMode } from '@/lib/store';
import { useAudioProgress } from '@/hooks/useAudioProgress';
import { useDragPercent } from '@/hooks/useDragPercent';
import { formatTime } from '@/lib/format';
import { LyricsOverlay } from '@/components/player/LyricsOverlay';
import { QueueDrawer } from '@/components/player/QueueDrawer';
import { PlayerSettingsMenu } from '@/components/player/PlayerSettingsMenu';

const MODES: { id: PlayMode; icon: string; label: string }[] = [
  { id: 'loop', icon: '🔁', label: '列表循环' },
  { id: 'single', icon: '🔂', label: '单曲循环' },
  { id: 'random', icon: '🔀', label: '随机播放' },
];

export default function PlayerBar() {
  const router = useRouter();
  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const volume = useMusicStore((s) => s.volume);
  const playMode = useMusicStore((s) => s.playMode);
  const liked = useMusicStore((s) => !!currentSong && s.isLiked(currentSong.id));
  const barHidden = useMusicStore((s) => s.barHidden);
  const setBarHidden = useMusicStore((s) => s.setBarHidden);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const next = useMusicStore((s) => s.next);
  const prev = useMusicStore((s) => s.prev);
  const setVolume = useMusicStore((s) => s.setVolume);
  const seekTo = useMusicStore((s) => s.seekTo);
  const setPlayMode = useMusicStore((s) => s.setPlayMode);
  const toggleLike = useMusicStore((s) => s.toggleLike);

  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const playlistCount = useMusicStore((s) => s.playlist.length);

  const { currentTime, duration } = useAudioProgress();
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const { containerRef: progressBarRef, start: startProgress, isDragging: progressDragging } = useDragPercent(
    (percent) => seekTo(percent * duration)
  );
  const { containerRef: volumeBarRef, start: startVolume } = useDragPercent((percent) =>
    setVolume(Math.max(0, Math.min(1, percent)))
  );

  if (!currentSong) return null;

  const currentMode = MODES.find((m) => m.id === playMode) ?? MODES[0];
  const coverTint = 'var(--cover-color, 168,85,247)';

  return (
    <>
      {/* ===== 主播放条 ===== */}
      <AnimatePresence>
        {!barHidden && (
          <motion.div
            key="player-bar"
            initial={{ y: 0 }}
            exit={{ y: '110%', opacity: 0.5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 34 }}
            className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]"
          >
            {/* 进度条 */}
            <div
              ref={progressBarRef}
              className="h-1.5 bg-white/10 cursor-pointer group select-none touch-none relative"
              onPointerDown={startProgress}
            >
              <div
                className={`h-full relative ${progressDragging ? '' : 'transition-[width] duration-150'}`}
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, var(--color-primary, #a855f7), var(--color-accent, #06b6d4))',
                  boxShadow: '0 0 12px rgba(var(--cover-color, 168,85,247), 0.55)',
                }}
              >
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ boxShadow: '0 0 14px rgba(var(--cover-color, 168,85,247), 0.9)' }}
                />
              </div>
            </div>

            {/* 主控制区 */}
            <div
              className="px-3 sm:px-5 py-3 flex items-center justify-between gap-2"
              style={{
                background: 'linear-gradient(180deg, rgba(12,12,29,0.82) 0%, rgba(12,12,29,0.96) 100%)',
                backdropFilter: 'blur(24px)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* 左侧：歌曲信息 */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 hover:scale-105 transition-transform group"
                  onClick={() => router.push('/visualizer')}
                  title="进入可视化"
                >
                  <Image src={currentSong.cover} alt={currentSong.title} fill sizes="48px" className="object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </div>
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{currentSong.title}</p>
                  <p className="text-xs text-white/50 truncate">{currentSong.artist}</p>
                </div>
              </div>

              {/* 中间：播放控制 */}
              <div className="flex items-center gap-1.5 sm:gap-3">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                  onClick={prev}
                  title="上一首"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-11 h-11 rounded-full bg-gradient-primary flex items-center justify-center text-white shadow-lg"
                  style={{ boxShadow: '0 0 20px rgba(var(--cover-color, 168,85,247), 0.45)' }}
                  onClick={togglePlay}
                  title={isPlaying ? '暂停' : '播放'}
                >
                  {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                  onClick={next}
                  title="下一首"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </motion.button>
              </div>

              {/* 右侧：模式 + 喜欢 + 队列 + 歌词 + 设置 + 音量 + 时间 + 收起 */}
              <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end min-w-0">
                <button
                  className="hidden sm:flex p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                  onClick={() => setPlayMode(currentMode.id === 'loop' ? 'single' : currentMode.id === 'single' ? 'random' : 'loop')}
                  title={currentMode.label}
                >
                  <span className="text-lg leading-none">{currentMode.icon}</span>
                </button>

                <button
                  className={`p-2 rounded-full hover:bg-white/10 transition-colors ${liked ? 'text-red-400' : 'text-white/60 hover:text-white'}`}
                  onClick={() => currentSong && toggleLike(currentSong)}
                  title={liked ? '取消喜欢' : '喜欢'}
                >
                  <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>

                {/* 播放队列 */}
                <button
                  className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                  onClick={() => setQueueOpen(true)}
                  title={`播放队列（${playlistCount} 首）`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10m4-1v6m3-3h-6" />
                  </svg>
                  {playlistCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gradient-primary text-[9px] leading-4 text-white font-semibold text-center">
                      {playlistCount > 99 ? '99+' : playlistCount}
                    </span>
                  )}
                </button>

                <button
                  className={`p-2 rounded-full hover:bg-white/10 transition-colors ${lyricsOpen ? 'text-acc' : 'text-white/60 hover:text-white'}`}
                  onClick={() => setLyricsOpen(!lyricsOpen)}
                  title="歌词"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h4m4 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>

                {/* 设置（音质/倍速/定时关闭） */}
                <div className="relative">
                  <button
                    className={`p-2 rounded-full hover:bg-white/10 transition-colors ${settingsOpen ? 'text-acc' : 'text-white/60 hover:text-white'}`}
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    title="播放设置"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v2m0 10v2m-7-7h2m10 0h2M6.34 6.34l1.42 1.42m8.48 8.48l1.42 1.42m0-11.32l-1.42 1.42M7.76 16.24l-1.42 1.42M12 9a3 3 0 100 6 3 3 0 000-6z" />
                    </svg>
                  </button>
                  <AnimatePresence>
                    {settingsOpen && (
                      <PlayerSettingsMenu onClose={() => setSettingsOpen(false)} />
                    )}
                  </AnimatePresence>
                </div>

                <div className="hidden md:flex items-center gap-2 w-24">
                  <svg className="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                  <div
                    ref={volumeBarRef}
                    className="h-1 flex-1 bg-white/20 rounded-full cursor-pointer group/vol relative"
                    onPointerDown={startVolume}
                  >
                    <div
                      className="h-full rounded-full relative"
                      style={{
                        width: `${volume * 100}%`,
                        background: 'linear-gradient(90deg, rgba(var(--cover-color, 168,85,247), 0.7), rgba(var(--cover-color, 168,85,247), 1))',
                      }}
                    />
                  </div>
                </div>

                <span className="hidden sm:block text-xs text-white/50 w-16 text-right font-mono tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                {/* 收起按钮 */}
                <button
                  className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                  onClick={() => setBarHidden(true)}
                  title="收起播放条"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== mini 悬浮播放器（播放条隐藏时） ===== */}
      <AnimatePresence>
        {barHidden && (
          <motion.button
            key="mini-player"
            initial={{ opacity: 0, scale: 0.5, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 30 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            onClick={() => setBarHidden(false)}
            className="fixed bottom-5 right-5 z-50 group"
            title="展开播放条"
            style={{
              bottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
            }}
          >
            <div
              className="relative w-16 h-16 rounded-full p-[3px]"
              style={{
                background: `conic-gradient(from 0deg, rgba(${coverTint},0.9), rgba(255,255,255,0.15), rgba(${coverTint},0.9))`,
                boxShadow: `0 8px 30px rgba(${coverTint}, 0.4)`,
              }}
            >
              <div className="relative w-full h-full rounded-full overflow-hidden bg-[#0a0a1a]">
                <Image
                  src={currentSong.cover}
                  alt={currentSong.title}
                  fill
                  sizes="64px"
                  className={`object-cover ${isPlaying ? 'animate-spin [animation-duration:9s]' : ''}`}
                />
              </div>
              {/* 悬停展开提示 */}
              <div className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </div>
              {/* 播放状态呼吸点 */}
              <span
                className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a1a] ${
                  isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'
                }`}
              />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ===== 歌词浮层 ===== */}
      <AnimatePresence>
        {lyricsOpen && !barHidden && (
          <LyricsOverlay onClose={() => setLyricsOpen(false)} />
        )}
      </AnimatePresence>

      {/* ===== 播放队列抽屉 ===== */}
      <AnimatePresence>
        {queueOpen && <QueueDrawer onClose={() => setQueueOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
