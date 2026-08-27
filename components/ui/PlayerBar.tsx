'use client';

/**
 * 底部播放控制栏（纯视图）
 * 音频元素归 audioEngine 所有；本组件只发 store 指令、读音频事件。
 * currentTime/duration 由 useAudioProgress 提供；进度/音量拖拽由 useDragPercent 驱动。
 */
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useMusicStore, type PlayMode } from '@/lib/store';
import { useAudioProgress } from '@/hooks/useAudioProgress';
import { useDragPercent } from '@/hooks/useDragPercent';

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
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const next = useMusicStore((s) => s.next);
  const prev = useMusicStore((s) => s.prev);
  const setVolume = useMusicStore((s) => s.setVolume);
  const seekTo = useMusicStore((s) => s.seekTo);
  const setPlayMode = useMusicStore((s) => s.setPlayMode);
  const toggleLike = useMusicStore((s) => s.toggleLike);

  const { currentTime, duration } = useAudioProgress();
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const { containerRef: progressBarRef, start: startProgress, isDragging: progressDragging } = useDragPercent(
    (percent) => seekTo(percent * duration)
  );
  const { containerRef: volumeBarRef, start: startVolume } = useDragPercent((percent) =>
    setVolume(Math.max(0, Math.min(1, percent)))
  );

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSong) return null;

  const currentMode = MODES.find((m) => m.id === playMode) ?? MODES[0];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* 进度条 */}
      <div
        ref={progressBarRef}
        className="h-1.5 bg-white/10 cursor-pointer group select-none touch-none"
        onPointerDown={startProgress}
      >
        <div
          className={`h-full bg-gradient-to-r from-purple-500 to-pink-500 relative ${progressDragging ? '' : 'transition-all'}`}
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
        </div>
      </div>

      {/* 主控制区 */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(12, 12, 29, 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* 左侧：歌曲信息 */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 hover:scale-105 transition-transform relative"
            onClick={() => router.push('/visualizer')}
            title="进入可视化"
          >
            <Image src={currentSong.cover} alt={currentSong.title} width={48} height={48} className="object-cover" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentSong.title}</p>
            <p className="text-xs text-white/50 truncate">{currentSong.artist}</p>
          </div>
        </div>

        {/* 中间：播放控制 */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            onClick={prev}
            title="上一首"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white hover:scale-105 transition-transform shadow-glow"
            onClick={togglePlay}
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
          </button>

          <button
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            onClick={next}
            title="下一首"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* 右侧：模式 + 喜欢 + 音量 + 时间 */}
        <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
          <button
            className="hidden sm:flex p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            onClick={() => setPlayMode(currentMode.id === 'loop' ? 'single' : currentMode.id === 'single' ? 'random' : 'loop')}
            title={currentMode.label}
          >
            <span className="text-lg">{currentMode.icon}</span>
          </button>

          <button
            className={`p-2 rounded-full hover:bg-white/10 transition-colors ${liked ? 'text-red-500' : 'text-white/60 hover:text-white'}`}
            onClick={() => currentSong && toggleLike(currentSong)}
            title={liked ? '取消喜欢' : '喜欢'}
          >
            <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          <div className="hidden md:flex items-center gap-2 w-24">
            <svg className="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
            <div
              ref={volumeBarRef}
              className="h-1 flex-1 bg-white/20 rounded-full cursor-pointer"
              onPointerDown={startVolume}
            >
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${volume * 100}%` }}
              />
            </div>
          </div>

          <span className="hidden sm:block text-xs text-white/50 w-16 text-right font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
