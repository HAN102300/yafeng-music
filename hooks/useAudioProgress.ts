'use client';

/**
 * useAudioProgress - 读取音频当前进度与总长
 * 订阅 audioEngine 的 timeupdate / loadedmetadata / durationchange 事件，
 * 进度更新约 4Hz，本组件局部 state 不进全局 store。
 */
import { useEffect, useState } from 'react';
import { audioEngine } from '@/lib/audio/engine';

export function useAudioProgress() {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const seekTo = (time: number) => {
    const audio = audioEngine.getAudio();
    if (!audio) return;
    if (isFinite(time)) {
      audio.currentTime = Math.max(0, time);
      setCurrentTime(audio.currentTime);
    }
  };

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

  return { currentTime, duration, seekTo };
}
