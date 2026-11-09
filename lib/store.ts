'use client';

/**
 * Zustand 全局状态管理
 *
 * 只保留低频状态（当前歌曲/播放态/列表/音量/UI）。
 * 高频状态（currentTime/progress/duration）不进 store，
 * 由消费者直接监听 audioEngine 的音频事件或订阅帧调度器获取。
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { desktopStorage } from '@/lib/desktopStorage';
import type { Track } from './data';
import type { SongQuality } from './server/netEase';
import { audioEngine } from './audio/engine';

export type PlayMode = 'loop' | 'single' | 'random';

/** 音质选项（标准/较高/极高/无损；VIP 档位失败自动回落） */
export const QUALITY_OPTIONS: { id: SongQuality; label: string }[] = [
  { id: 'standard', label: '标准' },
  { id: 'higher', label: '较高' },
  { id: 'exhigh', label: '极高' },
  { id: 'lossless', label: '无损' },
];

/** 倍速选项 */
export const RATE_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface MusicStore {
  // 播放状态（低频）
  currentSong: Track | null;
  isPlaying: boolean;
  playlist: Track[];
  volume: number;
  playMode: PlayMode;
  /** 收藏的歌曲（完整 Track 快照，本地/在线歌均可恢复展示） */
  likedTracks: Track[];

  // UI 状态
  visualizerSceneId: string;
  /** 底部播放条是否隐藏（隐藏后右下角显示 mini 悬浮播放器） */
  barHidden: boolean;
  setBarHidden: (hidden: boolean) => void;

  /** 站点主题 id（见 lib/themes.ts） */
  themeId: string;
  setThemeId: (id: string) => void;

  /** 音质档位 / 倍速 / 定时关闭（绝对时间戳 ms，null=未开启） */
  quality: SongQuality;
  setQuality: (q: SongQuality) => void;
  playbackRate: number;
  setPlaybackRate: (r: number) => void;
  sleepTimerEndsAt: number | null;
  setSleepTimer: (minutes: number | null) => void;
  /** 音源重载信号：音质切换时 bump，触发引擎重新解析当前曲 */
  srcEpoch: number;

  /** 播放历史（最近在听，去重上限 100） */
  history: Track[];
  recordPlay: (song: Track) => void;
  clearHistory: () => void;

  // 播放控制
  play: (song: Track) => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (time: number) => void;
  setVolume: (v: number) => void;
  /** 整列入队并从指定下标开始播放（排行榜/歌单场景） */
  playQueueFrom: (list: Track[], index: number) => void;
  /** 从队列移除单曲（移除当前曲时自动切换到下一首） */
  removeFromQueue: (id: number) => void;
  /** 清空队列并停止播放 */
  clearQueue: () => void;

  // 播放模式 / 收藏
  setPlayMode: (mode: PlayMode) => void;
  toggleLike: (song: Track) => void;
  isLiked: (songId: number) => boolean;

  // UI 控制
  setVisualizerScene: (id: string) => void;
}

export const useMusicStore = create<MusicStore>()(
  persist(
    (set, get) => ({
      // 初始状态（队列不再预置本地歌，全部来自在线曲库）
      currentSong: null,
      isPlaying: false,
      playlist: [],
      volume: 0.7,
      playMode: 'loop',
      likedTracks: [],

      visualizerSceneId: 'flow',
      barHidden: false,
      setBarHidden: (hidden: boolean) => set({ barHidden: hidden }),

      themeId: 'nebula',
      setThemeId: (id: string) => set({ themeId: id }),

      quality: 'standard',
      setQuality: (q: SongQuality) => set((s) => ({ quality: q, srcEpoch: s.srcEpoch + 1 })),
      playbackRate: 1,
      setPlaybackRate: (r: number) => set({ playbackRate: r }),
      sleepTimerEndsAt: null,
      setSleepTimer: (minutes: number | null) =>
        set({ sleepTimerEndsAt: minutes ? Date.now() + minutes * 60000 : null }),
      srcEpoch: 0,

      history: [],
      recordPlay: (song: Track) => {
        set((state) => ({
          history: [song, ...state.history.filter((t) => t.id !== song.id)].slice(0, 100),
        }));
      },
      clearHistory: () => set({ history: [] }),

      // 播放控制
      play: (song: Track) => {
        if (get().currentSong?.id === song.id) {
          set({ isPlaying: true });
        } else {
          set({ currentSong: song, isPlaying: true });
        }
      },

      pause: () => set({ isPlaying: false }),

      togglePlay: () => {
        const { currentSong, isPlaying } = get();
        if (currentSong) {
          set({ isPlaying: !isPlaying });
        }
      },

      next: () => {
        const { playlist, currentSong, playMode } = get();
        if (playlist.length === 0) return;

        if (playMode === 'random') {
          // 随机不重复当前曲（单曲队列除外）
          const candidates =
            playlist.length > 1
              ? playlist.filter((s) => s.id !== currentSong?.id)
              : playlist;
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          set({ currentSong: pick, isPlaying: true });
          return;
        }

        const currentIndex = currentSong
          ? playlist.findIndex((s) => s.id === currentSong.id)
          : -1;
        // findIndex -1（当前歌不在列表中）时兜底到列表头
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % playlist.length;
        set({ currentSong: playlist[nextIndex], isPlaying: true });
      },

      prev: () => {
        const { playlist, currentSong, playMode } = get();
        if (playlist.length === 0) return;

        if (playMode === 'random') {
          const candidates =
            playlist.length > 1
              ? playlist.filter((s) => s.id !== currentSong?.id)
              : playlist;
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          set({ currentSong: pick, isPlaying: true });
          return;
        }

        const currentIndex = currentSong
          ? playlist.findIndex((s) => s.id === currentSong.id)
          : -1;
        const prevIndex =
          currentIndex === -1 ? 0 : (currentIndex - 1 + playlist.length) % playlist.length;
        set({ currentSong: playlist[prevIndex], isPlaying: true });
      },

      seekTo: (time: number) => {
        audioEngine.seek(time);
      },

      setVolume: (v: number) => set({ volume: Math.max(0, Math.min(1, v)) }),

      playQueueFrom: (list: Track[], index: number) => {
        if (list.length === 0) return;
        const safeIndex = Math.max(0, Math.min(index, list.length - 1));
        set({ playlist: list, currentSong: list[safeIndex], isPlaying: true });
      },

      removeFromQueue: (id: number) => {
        const { playlist, currentSong } = get();
        const idx = playlist.findIndex((t) => t.id === id);
        if (idx === -1) return;
        const newList = playlist.filter((t) => t.id !== id);

        if (currentSong?.id !== id) {
          set({ playlist: newList });
          return;
        }
        // 移除的是当前曲：队列空则停止，否则切到相邻一首
        if (newList.length === 0) {
          set({ playlist: [], currentSong: null, isPlaying: false });
          audioEngine.getAudio()?.pause();
          return;
        }
        const nextTrack = newList[Math.min(idx, newList.length - 1)];
        set({ playlist: newList, currentSong: nextTrack, isPlaying: true });
      },

      clearQueue: () => {
        set({ playlist: [], currentSong: null, isPlaying: false });
        audioEngine.getAudio()?.pause();
      },

      setPlayMode: (mode: PlayMode) => set({ playMode: mode }),

      toggleLike: (song: Track) => {
        // 先取翻转前状态：nextLiked = 本次操作后是否为"已喜欢"
        const willLike = !get().likedTracks.some((t) => t.id === song.id);

        set((state) => {
          const exists = state.likedTracks.some((t) => t.id === song.id);
          return {
            likedTracks: exists
              ? state.likedTracks.filter((t) => t.id !== song.id)
              : [song, ...state.likedTracks].slice(0, 500),
          };
        });

        // 云端同步（乐观更新：失败回滚并提示）。仅网易云在线歌曲且有登录态时尝试
        if (!song.neteaseId) return;
        const musicU =
          typeof window !== 'undefined' ? localStorage.getItem('yafeng-ncm-music-u') : null;
        if (!musicU) return; // 未登录：仅本地收藏，不打扰用户

        const nextLiked = willLike;
        void (async () => {
          try {
            const { likeSongNetEase } = await import('@/lib/api');
            const { toast } = await import('@/lib/toast');
            const r = await likeSongNetEase(song.neteaseId as number, nextLiked);
            if (r.ok) {
              toast(nextLiked ? '已添加到网易云「喜欢的音乐」' : '已从网易云喜欢中移除');
            } else {
              // 回滚
              set((state) => ({
                likedTracks: nextLiked
                  ? state.likedTracks.filter((t) => t.id !== song.id)
                  : [song, ...state.likedTracks].slice(0, 500),
              }));
              toast(r.error || '云端收藏失败，仅保留本地记录');
            }
          } catch {
            // 网络异常：静默（本地记录保留）
          }
        })();
      },

      isLiked: (songId: number) => get().likedTracks.some((t) => t.id === songId),

      setVisualizerScene: (id: string) => set({ visualizerSceneId: id }),
    }),
    {
      name: 'yafeng-music-player',
      storage: createJSONStorage(() => desktopStorage),
      version: 1,
      // 只持久化低敏感、可恢复的状态；isPlaying 不持久化（自动播放策略）
      partialize: (state) => ({
        currentSong: state.currentSong,
        playlist: state.playlist,
        volume: state.volume,
        visualizerSceneId: state.visualizerSceneId,
        playMode: state.playMode,
        likedTracks: state.likedTracks,
        history: state.history,
        barHidden: state.barHidden,
        themeId: state.themeId,
        quality: state.quality,
        playbackRate: state.playbackRate,
      }),
      // v0 → v1：likedIds（仅 id）迁移为 likedTracks 快照（本地曲库已移除，旧 id 无法回查则清空）
      migrate: (persisted) => {
        const p = persisted as Partial<{
          likedIds: number[];
          likedTracks: Track[];
        }> & Record<string, unknown>;
        if (!p.likedTracks && Array.isArray(p.likedIds)) {
          p.likedTracks = [];
        }
        return p as unknown as MusicStore;
      },
    }
  )
);
