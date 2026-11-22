'use client';

/**
 * 可视化页底部控制舱（沉浸剧场专属）
 *
 * 功能与主播放条对齐：播放模式 / 上一首 / 播放暂停 / 下一首 / 喜欢
 *                + 音量滑条（悬停展开）+ 播放队列抽屉 + 歌词浮层开关
 * 自适应：整舱尺寸随视口高度弹性缩放（clamp），窗口放大缩小不呆板
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMusicStore, type PlayMode } from '@/lib/store';
import { useAudioProgress } from '@/hooks/useAudioProgress';
import { useDragPercent } from '@/hooks/useDragPercent';
import { formatTime } from '@/lib/format';
import { QueueDrawer } from '@/components/player/QueueDrawer';
import { LyricsOverlay } from '@/components/player/LyricsOverlay';

const MODES: { id: PlayMode; icon: string; label: string }[] = [
  { id: 'loop', icon: '🔁', label: '列表循环' },
  { id: 'single', icon: '🔂', label: '单曲循环' },
  { id: 'random', icon: '🔀', label: '随机播放' },
];

interface VisualizerDockProps {
  /** 舱内任意交互发生时调用：重置父级自动隐藏计时器 */
  onActivity: () => void;
  /** 是否无当前歌（无歌时禁用切歌类按钮） */
  hasSong: boolean;
}

export function VisualizerDock({ onActivity, hasSong }: VisualizerDockProps) {
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const volume = useMusicStore((s) => s.volume);
  const setVolume = useMusicStore((s) => s.setVolume);
  const playMode = useMusicStore((s) => s.playMode);
  const setPlayMode = useMusicStore((s) => s.setPlayMode);
  const next = useMusicStore((s) => s.next);
  const prev = useMusicStore((s) => s.prev);
  const toggleLike = useMusicStore((s) => s.toggleLike);
  const currentSong = useMusicStore((s) => s.currentSong);
  const liked = useMusicStore((s) => !!currentSong && s.isLiked(currentSong.id));
  const playlistCount = useMusicStore((s) => s.playlist.length);

  const { currentTime, duration, seekTo } = useAudioProgress();
  const progressDrag = useDragPercent((pct) => seekTo(pct * duration));
  const { containerRef: volumeRef, start: startVolume } = useDragPercent((pct) =>
    setVolume(Math.max(0, Math.min(1, pct)))
  );
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const [queueOpen, setQueueOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [volHover, setVolHover] = useState(false);

  const currentMode = MODES.find((m) => m.id === playMode) ?? MODES[0];
  const touching = (fn: () => void) => () => { onActivity(); fn(); };

  return (
    <div
      className="viz-dock w-full max-w-xl rounded-3xl border border-white/10 backdrop-blur-2xl viz-dock-pad"
      style={{
        background: 'color-mix(in srgb, var(--color-dark-base) 72%, transparent)',
        boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
      }}
      onMouseEnter={onActivity}
    >
      {/* 进度条（高度随视口弹性） */}
      <div
        ref={progressDrag.containerRef}
        className="w-full viz-progress bg-white/10 rounded-full cursor-pointer relative group select-none touch-none"
        onPointerDown={(e) => { onActivity(); progressDrag.start(e); }}
      >
        <div
          className="h-full rounded-full relative"
          style={{
            width: (progressDrag.isDragging ? progressDrag.percent * 100 : progressPercent) + '%',
            background: 'linear-gradient(90deg, var(--color-primary, #a855f7), var(--color-accent, #06b6d4))',
            boxShadow: '0 0 12px color-mix(in srgb, var(--color-primary) 55%, transparent)',
          }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="flex justify-between text-xs text-white/40 mt-1.5 tabular-nums">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* 控制键行 */}
      <div className="flex items-center justify-center viz-dock-gap mt-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={touching(() => setPlayMode(playMode === 'loop' ? 'single' : playMode === 'single' ? 'random' : 'loop'))}
          className="viz-btn-sm rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white text-lg"
          title={currentMode.label}
        >
          {currentMode.icon}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={touching(prev)}
          disabled={!hasSong}
          className="viz-btn-md rounded-full hover:bg-white/10 transition-colors disabled:opacity-30"
          title="上一首"
        >
          <svg className="viz-ico-md text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </motion.button>

        {/* 播放/暂停（尺寸随视口弹性）；无歌时派发开播事件由页面处理 */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={touching(() => document.dispatchEvent(new CustomEvent('yafeng:viz-playpause')))}
          className="viz-play-btn shrink-0 rounded-full flex items-center justify-center transition-all"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary, #a855f7), var(--color-accent, #06b6d4))',
            boxShadow: '0 0 34px color-mix(in srgb, var(--color-primary) 45%, transparent)',
          }}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? (
            <svg className="viz-ico-play text-white on-accent" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="viz-ico-play text-white on-accent ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={touching(next)}
          disabled={!hasSong}
          className="viz-btn-md rounded-full hover:bg-white/10 transition-colors disabled:opacity-30"
          title="下一首"
        >
          <svg className="viz-ico-md text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={touching(() => currentSong && toggleLike(currentSong))}
          disabled={!hasSong}
          className={('viz-btn-sm rounded-full hover:bg-white/10 transition-colors disabled:opacity-30 ') + (liked ? 'text-red-400' : 'text-white/50 hover:text-white')}
          title={liked ? '取消喜欢' : '喜欢'}
        >
          <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </motion.button>
      </div>

      {/* 副功能行：队列 / 音量 / 歌词 */}
      <div className="flex items-center justify-between viz-subrow mt-2.5">
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={touching(() => setQueueOpen(true))}
          className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          title={('播放队列（' + playlistCount + ' 首）')}
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10m4-1v6m3-3h-6" />
          </svg>
          {playlistCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gradient-primary text-[9px] leading-4 text-white font-semibold text-center">
              {playlistCount > 99 ? '99+' : playlistCount}
            </span>
          )}
        </motion.button>

        {/* 音量：悬停展开滑条 */}
        <div
          className="flex items-center gap-2"
          onMouseEnter={() => { setVolHover(true); onActivity(); }}
          onMouseLeave={() => setVolHover(false)}
        >
          <button
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
            title={volume === 0 ? '取消静音' : '静音'}
            onClick={touching(() => setVolume(volume === 0 ? 0.7 : 0))}
          >
            {volume === 0 ? (
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.5 12L14 9.5v5L16.5 12zM19 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            ) : (
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>
          <div
            ref={volumeRef}
            onPointerDown={(e) => { onActivity(); startVolume(e); }}
            className={('h-1 rounded-full bg-white/20 cursor-pointer transition-all duration-200 ') + (volHover ? 'w-24 opacity-100' : 'w-0 opacity-0')}
          >
            <div
              className="h-full rounded-full relative"
              style={{
                width: volume * 100 + '%',
                background: 'linear-gradient(90deg, rgba(var(--cover-color, 168,85,247), 0.7), rgba(var(--cover-color, 168,85,247), 1))',
              }}
            />
          </div>
          <span className={('text-[10px] text-white/35 tabular-nums transition-opacity ') + (volHover ? 'opacity-100' : 'opacity-0')}>
            {Math.round(volume * 100)}
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={touching(() => setLyricsOpen(true))}
          disabled={!hasSong}
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white disabled:opacity-30"
          title="全屏歌词"
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h4m4 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </motion.button>
      </div>

      {/* 队列抽屉 / 歌词浮层（复用全局组件） */}
      <AnimatePresence>
        {queueOpen && <QueueDrawer onClose={() => setQueueOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {lyricsOpen && <LyricsOverlay onClose={() => setLyricsOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
