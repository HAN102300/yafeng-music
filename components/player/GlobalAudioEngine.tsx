'use client';

/**
 * GlobalAudioEngine - 无头全局播放组件
 *
 * 挂载于根布局，是 store 播放意图与 audioEngine 唯一音源之间的桥梁：
 * - currentSong 变化（或音质切换 bump srcEpoch）→ 切换 src 并加载
 * - isPlaying 变化 → play/pause（首个播放手势链中建立分析链 + resume）
 * - volume / playbackRate 变化 → 同步到音频元素
 * - ended → 单曲循环重播 / 自动下一首
 * - 播放失败（源解析失败 / audio error）→ 失效缓存重取 → 重试一次 → 自动跳曲并提示
 * - Media Session：系统媒体键 / 锁屏封面与进度控制
 * - 定时关闭：到点音量淡出后暂停
 * - 播放中以 ~10fps 节流计算节拍驱动主题并写入全站 CSS 变量
 */
import { useEffect, useRef } from 'react';
import { useMusicStore } from '@/lib/store';
import { audioEngine } from '@/lib/audio/engine';
import { subscribeFrame } from '@/lib/audio/frameScheduler';
import { calculateTheme, applyThemeToDOM } from '@/lib/themeEngine';
import { resolveTrackSrcWithInfo, invalidateTrack, prefetchTrack, clearUrlCache } from '@/lib/onlineSource';
import { getNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/lib/toast';

/** 停滞判定阈值：waiting/stalled 后超过此时长仍无缓冲进展即判卡死 */
const STALL_TIMEOUT_MS = 5000;

export default function GlobalAudioEngine() {
  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const volume = useMusicStore((s) => s.volume);
  const playbackRate = useMusicStore((s) => s.playbackRate);
  const srcEpoch = useMusicStore((s) => s.srcEpoch);
  const sleepTimerEndsAt = useMusicStore((s) => s.sleepTimerEndsAt);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // 已加载歌曲 key（id:音源代次），避免同一首歌重复设置 src
  const loadedKeyRef = useRef<string | null>(null);
  // 当前正在重试的歌曲 id（audio error 重试只做一次，防止死循环）
  const retryingIdRef = useRef<number | null>(null);
  // 连续失败计数：整条队列都不可播时停下来，而不是无限跳曲
  const failStreakRef = useRef(0);
  // 停滞检测：waiting/stalled 后超过阈值仍无进展 → 判定卡死自动跳曲
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 清除停滞计时器（切歌 / 恢复缓冲 / 暂停时调用） */
  const clearStallTimer = () => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  };

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
    // Web Audio 分析链接入后高倍速可能破音：超安全区先临时回落 1x
    if (!audioEngine.isRateSafe(audio.playbackRate)) {
      audio.playbackRate = 1;
      toast('当前倍速与音频输出模式不兼容，已临时回落为 1.0x', 'info');
    }
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

  /** 停滞监视：超时仍未缓冲出声音 → 自动跳过（音频损坏/链接失效兜底） */
  const startStallTimer = (title: string) => {
    clearStallTimer();
    stallTimerRef.current = setTimeout(() => {
      stallTimerRef.current = null;
      const state = useMusicStore.getState();
      // 用户已暂停：不再自动跳
      if (!state.isPlaying) return;
      if (shouldStopSkipping()) {
        state.pause();
        toast('歌曲加载超时，已停止播放（网络异常或歌曲不可用）', 'error');
        return;
      }
      skipNext(`《${title}》加载超时，已自动切换下一首`);
    }, STALL_TIMEOUT_MS);
  };

  // 歌曲切换 / 音质切换：解析播放源（本地 / 在线）并加载
  useEffect(() => {
    const audio = audioEngine.getAudio();
    if (!audio || !currentSong) return;
    let cancelled = false;

    // 断网时拦截切歌：恢复联网后由用户手动继续
    if (!getNetworkStatus().online) {
      toast('当前已断开网络，无法切换歌曲', 'error');
      useMusicStore.getState().pause();
      return;
    }

    (async () => {
      try {
        const quality = useMusicStore.getState().quality;
        const { url: src, fee } = await resolveTrackSrcWithInfo(currentSong, quality);
        if (cancelled || !audio) return;

        const loadKey = `${currentSong.id}:${srcEpoch}`;
        if (loadedKeyRef.current === loadKey) return;

        loadedKeyRef.current = loadKey;
        retryingIdRef.current = null;
        failStreakRef.current = 0;
        clearStallTimer();
        audio.src = src;
        audio.playbackRate = useMusicStore.getState().playbackRate;
        audio.load();
        if (isPlayingRef.current) {
          tryPlay();
          // 加载监视：超时未就绪自动跳曲（VIP 高音质无权限时上游可能给空流）
          if (fee === 1 || fee === 4) startStallTimer(currentSong.title);
        }

        // 记录播放历史（最近在听）
        useMusicStore.getState().recordPlay(currentSong);

        // 预取队列下一首的播放地址，切歌零等待
        const { playlist } = useMusicStore.getState();
        const idx = playlist.findIndex((t) => t.id === currentSong.id);
        const nextTrack = idx >= 0 ? playlist[(idx + 1) % playlist.length] : undefined;
        if (nextTrack?.neteaseId) prefetchTrack(nextTrack, quality);
      } catch (err) {
        if (cancelled) return;
        console.error('[GlobalAudioEngine] 播放源解析失败:', err);
        if (shouldStopSkipping()) {
          useMusicStore.getState().pause();
          toast('当前队列没有可播放的歌曲，已停止播放', 'error');
          return;
        }
        // err.message 由 failHint 生成：区分「VIP 专属」「版权下架」
        skipNext(
          `《${currentSong.title}》${err instanceof Error ? err.message : '暂无可用播放源'}，已切下一首`
        );
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在歌曲 id / 音源代次变化时重新加载
  }, [currentSong?.id, srcEpoch]);

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

  // 倍速同步
  useEffect(() => {
    const audio = audioEngine.getAudio();
    if (audio) audio.playbackRate = playbackRate;
  }, [playbackRate]);

  // 音质切换：清空旧地址缓存（由 setQuality bump srcEpoch 触发重载）
  useEffect(() => {
    if (srcEpoch > 0) clearUrlCache();
  }, [srcEpoch]);

  // audio error → 缓存可能已过期：失效重取并重试一次，仍失败则自动跳曲
  useEffect(() => {
    const audio = audioEngine.getAudio();
    if (!audio) return;

    const handleError = async () => {
      clearStallTimer();
      const song = useMusicStore.getState().currentSong;
      if (!song) return;
      // 断网触发的加载错误：暂停等待恢复，不消耗跳曲次数
      if (!getNetworkStatus().online) {
        useMusicStore.getState().pause();
        toast('网络已断开，播放已暂停', 'error');
        return;
      }

      // 首次失败：失效缓存 → 重新解析 → 尽量恢复播放进度
      if (retryingIdRef.current !== song.id) {
        retryingIdRef.current = song.id;
        if (song.neteaseId) invalidateTrack(song.neteaseId);
        try {
          const src = (await resolveTrackSrcWithInfo(song, useMusicStore.getState().quality)).url;
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
        toast('当前队列没有可播放的歌曲，已停止播放', 'error');
        retryingIdRef.current = null;
        return;
      }
      retryingIdRef.current = null;
      loadedKeyRef.current = null;
      skipNext(`《${song.title}》播放失败，已自动切换下一首`);
    };

    audio.addEventListener('error', handleError);
    return () => audio.removeEventListener('error', handleError);
  }, []);

  // ===== 停滞检测：缓冲停滞超时未恢复 → 自动跳过 =====
  useEffect(() => {
    const audio = audioEngine.getAudio();
    if (!audio) return;

    const onStalled = () =>
      startStallTimer(useMusicStore.getState().currentSong?.title ?? '当前歌曲');
    const onProgress = () => clearStallTimer();
    audio.addEventListener('waiting', onStalled);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('canplay', onProgress);
    audio.addEventListener('playing', onProgress);
    audio.addEventListener('pause', onProgress);
    return () => {
      audio.removeEventListener('waiting', onStalled);
      audio.removeEventListener('stalled', onStalled);
      audio.removeEventListener('canplay', onProgress);
      audio.removeEventListener('playing', onProgress);
      audio.removeEventListener('pause', onProgress);
      clearStallTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时绑定一次
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

  // ===== Media Session：系统媒体键 / 锁屏控制 =====
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !currentSong) return;
    const ms = navigator.mediaSession;

    try {
      ms.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: '雅枫音乐',
        artwork: [{ src: currentSong.cover, sizes: '512x512' }],
      });
    } catch {
      /* 部分环境不支持 MediaMetadata */
    }

    const store = () => useMusicStore.getState();
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => store().togglePlay()],
      ['pause', () => store().togglePlay()],
      ['previoustrack', () => store().prev()],
      ['nexttrack', () => store().next()],
      [
        'seekto',
        (details) => {
          if (details.seekTime != null) store().seekTo(details.seekTime);
        },
      ],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        /* 不支持的 action 忽略 */
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          ms.setActionHandler(action, null);
        } catch {
          /* ignore */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 歌曲变化时更新元数据
  }, [currentSong?.id]);

  // Media Session 播放态 + 进度上报
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioEngine.getAudio();
    if (!audio || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const onTime = () => {
      if (!audio.duration || !isFinite(audio.duration)) return;
      try {
        navigator.mediaSession.setPositionState?.({
          duration: audio.duration,
          playbackRate: audio.playbackRate,
          position: Math.min(audio.currentTime, audio.duration),
        });
      } catch {
        /* duration 异常时忽略 */
      }
    };
    audio.addEventListener('timeupdate', onTime);
    return () => audio.removeEventListener('timeupdate', onTime);
  }, [currentSong?.id]);

  // 定时关闭：到点音量淡出后暂停
  useEffect(() => {
    if (!sleepTimerEndsAt) return;
    const timer = setInterval(() => {
      if (Date.now() < sleepTimerEndsAt) return;
      clearInterval(timer);
      useMusicStore.getState().setSleepTimer(null);

      const audio = audioEngine.getAudio();
      if (!audio) return;
      const startVol = audio.volume;
      let step = 0;
      const fade = setInterval(() => {
        step++;
        const v = Math.max(0, startVol * (1 - step / 40));
        audio.volume = v;
        if (v <= 0) {
          clearInterval(fade);
          useMusicStore.getState().pause();
          audio.volume = startVol; // 恢复音量供下次播放
          toast('定时关闭：已停止播放 😴', 'info');
        }
      }, 100);
    }, 1000);
    return () => clearInterval(timer);
  }, [sleepTimerEndsAt]);

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
