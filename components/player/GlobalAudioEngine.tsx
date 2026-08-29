'use client';

/**
 * GlobalAudioEngine - 无头全局播放组件
 *
 * 挂载于根布局，是 store 播放意图与 audioEngine 唯一音源之间的桥梁：
 * - currentSong 变化 → 切换 src 并加载
 * - isPlaying 变化 → play/pause（首个播放手势链中建立分析链 + resume）
 * - volume 变化 → 同步音量
 * - ended → 单曲循环重播 / 自动下一首
 * - 播放失败（源解析失败 / audio error）→ 失效缓存重取 → 重试一次 → 自动跳曲并提示
 * - 播放中以 ~10fps 节流计算节拍驱动主题并写入全站 CSS 变量
 */
import { useEffect, useRef } from 'react';
import { useMusicStore } from '@/lib/store';
import { audioEngine } from '@/lib/audio/engine';
import { subscribeFrame } from '@/lib/audio/frameScheduler';
import { calculateTheme, applyThemeToDOM } from '@/lib/themeEngine';
import { resolveTrackSrc, invalidateTrack } from '@/lib/onlineSource';
import { toast } from '@/lib/toast';

export default function GlobalAudioEngine() {
  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const volume = useMusicStore((s) => s.volume);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // 已加载歌曲 id，避免同一首歌重复设置 src
  const loadedIdRef = useRef<number | null>(null);
  // 当前正在重试的歌曲 id（audio error 重试只做一次，防止死循环）
  const retryingIdRef = useRef<number | null>(null);
  // 连续失败计数：整条队列都不可播时停下来，而不是无限跳曲
  const failStreakRef = useRef(0);

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

  // 跳到下一首（延一拍触发，避免在 ended/error 事件栈内同步改状态）
  const skipNext = (reason: string) => {
    toast(reason, 'error');
    setTimeout(() => {
      useMusicStore.getState().next();
    }, 400);
  };

  /** 连续失败是否已达整条队列（含上限 5 兜底），是则停下并提示 */
  const shouldStopSkipping = () => {
    const { playlist } = useMusicStore.getState();
    failStreakRef.current += 1;
    return failStreakRef.current >= Math.max(playlist.length, 5);
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
        retryingIdRef.current = null;
        failStreakRef.current = 0;
        audio.src = src;
        audio.load();
        if (isPlayingRef.current) tryPlay();
      } catch (err) {
        if (cancelled) return;
        console.error('[GlobalAudioEngine] 播放源解析失败:', err);
        if (shouldStopSkipping()) {
          useMusicStore.getState().pause();
          toast('当前队列没有可播放的歌曲（VIP/版权限制或网络异常）', 'error');
          return;
        }
        skipNext(
          `《${currentSong.title}》暂无可用播放源（可能为 VIP 歌曲），已切下一首`
        );
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

  // audio error → 缓存可能已过期：失效重取并重试一次，仍失败则自动跳曲
  useEffect(() => {
    const audio = audioEngine.getAudio();
    if (!audio) return;

    const handleError = async () => {
      const song = useMusicStore.getState().currentSong;
      if (!song) return;

      // 首次失败：失效缓存 → 重新解析 → 尽量恢复播放进度
      if (retryingIdRef.current !== song.id) {
        retryingIdRef.current = song.id;
        if (song.neteaseId) invalidateTrack(song.neteaseId);
        try {
          const src = await resolveTrackSrc(song);
          const fresh = audioEngine.getAudio();
          if (!fresh) return;
          const resumeAt = fresh.currentTime > 3 ? fresh.currentTime : 0;
          fresh.src = src;
          if (resumeAt > 0) {
            fresh.addEventListener(
              'loadedmetadata',
              () => {
                fresh.currentTime = resumeAt;
              },
              { once: true }
            );
          }
          fresh.load();
          await fresh.play();
          return;
        } catch {
          /* 重试仍失败，走跳曲 */
        }
      }

      if (shouldStopSkipping()) {
        useMusicStore.getState().pause();
        toast('当前队列没有可播放的歌曲（VIP/版权限制或网络异常）', 'error');
        retryingIdRef.current = null;
        return;
      }
      retryingIdRef.current = null;
      loadedIdRef.current = null;
      skipNext(`《${song.title}》播放失败，已自动切换下一首`);
    };

    audio.addEventListener('error', handleError);
    return () => audio.removeEventListener('error', handleError);
  }, []);

  // ended → 单曲循环重播 / 自动下一首（next 从 store 快照取，避免依赖闭包）
  useEffect(() => {
    const audio = audioEngine.getAudio();
    if (!audio) return;

    const handleEnded = () => {
      const { playMode } = useMusicStore.getState();
      if (playMode === 'single') {
        // 单曲循环：从头重播，不切换曲目
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      useMusicStore.getState().next();
    };
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
