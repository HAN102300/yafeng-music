'use client';

/**
 * GlobalAudioEngine - 无头全局播放组件
 *
 * 挂载于根布局，是 store 播放意图与 audioEngine 唯一音源之间的桥梁：
 * - currentSong 变化 → 切换 src 并加载
 * - isPlaying 变化 → play/pause（首个播放手势链中建立分析链 + resume）
 * - volume 变化 → 同步音量
 * - ended → 自动下一首
 * - 播放中以 ~10fps 节流计算节拍驱动主题并写入全站 CSS 变量
 */
import { useEffect, useRef } from 'react';
import { useMusicStore } from '@/lib/store';
import { audioEngine } from '@/lib/audio/engine';
import { subscribeFrame } from '@/lib/audio/frameScheduler';
import { calculateTheme, applyThemeToDOM } from '@/lib/themeEngine';
import { resolveTrackSrc } from '@/lib/onlineSource';

export default function GlobalAudioEngine() {
  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const volume = useMusicStore((s) => s.volume);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // 已加载歌曲 id，避免同一首歌重复设置 src
  const loadedIdRef = useRef<number | null>(null);

  // 尝试播放（建立分析链 + 恢复上下文）
  const tryPlay = () => {
    const audio = audioEngine.getAudio();
    if (!audio) return;
    try {
      audioEngine.ensureContext();
    } catch (err) {
      console.error('[GlobalAudioEngine] ensureContext 失败:', err);
    }
    audioEngine.resume();
    audio.play().catch((err) => {
      console.log('播放失败:', err);
    });
  };

  // 歌曲切换：解析播放源（本地 / 在线）并加载
  useEffect(() => {
    const audio = audioEngine.getAudio();
    if (!audio || !currentSong) return;
    let cancelled = false;

    (async () => {
      try {
        const src = await resolveTrackSrc(currentSong);
        if (cancelled || !audio) return;
        if (loadedIdRef.current === currentSong.id) return;

        loadedIdRef.current = currentSong.id;
        audio.src = src;
        audio.load();
        if (isPlayingRef.current) tryPlay();
      } catch (err) {
        console.error('[GlobalAudioEngine] 播放源解析失败:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在歌曲 id 变化时重新加载
  }, [currentSong?.id]);

  // 播放/暂停
  useEffect(() => {
    const audio = audioEngine.getAudio();
    if (!audio || !currentSong) return;

    if (isPlaying) {
      tryPlay();
    } else {
      audio.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖 isPlaying 与歌曲 id
  }, [isPlaying, currentSong?.id]);

  // 音量同步
  useEffect(() => {
    const audio = audioEngine.getAudio();
    if (audio) audio.volume = volume;
  }, [volume]);

  // ended → 自动下一首（next 从 store 快照取，避免依赖闭包）
  useEffect(() => {
    const audio = audioEngine.getAudio();
    if (!audio) return;

    const handleEnded = () => useMusicStore.getState().next();
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  // 节拍驱动全站主题：播放中订阅帧数据，~10fps 节流写 CSS 变量
  useEffect(() => {
    if (!isPlaying) return;

    let lastUpdate = 0;
    const unsubscribe = subscribeFrame((frame) => {
      const now = performance.now();
      if (now - lastUpdate < 100) return;
      lastUpdate = now;

      const theme = calculateTheme(frame.bass, frame.mid, frame.treble, frame.energy);
      applyThemeToDOM(theme);
    });
    return unsubscribe;
  }, [isPlaying]);

  return null;
}
