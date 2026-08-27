'use client';

/**
 * 底部播放控制栏（纯视图）
 * 音频元素归 audioEngine 所有；本组件只发 store 指令、读音频事件。
 * currentTime/duration 为本地低频状态（timeupdate 原生 ~4Hz），不进全局 store。
 */
import { useEffect, useRef, useState } from 'react';
import { useMusicStore } from '@/lib/store';
import { audioEngine } from '@/lib/audio/engine';

export default function PlayerBar() {
  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const volume = useMusicStore((s) => s.volume);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const next = useMusicStore((s) => s.next);
  const prev = useMusicStore((s) => s.prev);
  const setVolume = useMusicStore((s) => s.setVolume);
  const seekTo = useMusicStore((s) => s.seekTo);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);

  // 高频显示状态：仅本组件局部更新
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 监听引擎音频事件（timeupdate 原生节流 ~4Hz）
  useEffect(() => {
    const audio = audioEngine.getAudio();
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDuration = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };

    handleTimeUpdate();
    handleDuration();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleDuration);
    audio.addEventListener('durationchange', handleDuration);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleDuration);
      audio.removeEventListener('durationchange', handleDuration);
    };
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // 点击进度条跳转
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    seekTo(newTime);
    setCurrentTime(newTime);
  };

  // 点击音量条
  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeBarRef.current) return;
    const rect = volumeBarRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    setVolume(Math.max(0, Math.min(1, percent)));
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* 进度条（顶部细线） */}
      <div
        ref={progressBarRef}
        className="h-1 bg-white/10 cursor-pointer group"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 relative transition-all"
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
          <div
            className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
            style={{ boxShadow: isPlaying ? 'var(--glow-primary, none)' : 'none' }}
          >
            <img
              src={currentSong.cover}
              alt={currentSong.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentSong.title}</p>
            <p className="text-xs text-white/50 truncate">{currentSong.artist}</p>
          </div>
        </div>

        {/* 中间：播放控制 */}
        <div className="flex items-center gap-4">
          {/* 上一首 */}
          <button
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            onClick={prev}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          {/* 播放/暂停 */}
          <button
            className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity shadow-lg"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* 下一首 */}
          <button
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            onClick={next}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* 右侧：时间和音量 */}
        <div className="flex items-center gap-4 flex-1 justify-end">
          {/* 时间显示 */}
          <span className="text-xs text-white/40 hidden sm:block">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* 音量控制 */}
          <div className="hidden md:flex items-center gap-2">
            <button
              className="p-1 text-white/60 hover:text-white transition-colors"
              onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
            >
              {volume === 0 ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>
            <div
              ref={volumeBarRef}
              className="w-20 h-1 bg-white/20 rounded-full cursor-pointer group"
              onClick={handleVolumeClick}
            >
              <div
                className="h-full bg-white/60 rounded-full relative group-hover:bg-white transition-colors"
                style={{ width: `${volume * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
