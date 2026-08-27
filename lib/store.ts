'use client';

/**
 * Zustand 全局状态管理
 *
 * 只保留低频状态（当前歌曲/播放态/列表/音量/UI）。
 * 高频状态（currentTime/progress/duration）不进 store，
 * 由消费者直接监听 audioEngine 的音频事件或订阅帧调度器获取。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track, songs } from './data';
import { audioEngine } from './audio/engine';

interface MusicStore {
  // 播放状态（低频）
  currentSong: Track | null;
  isPlaying: boolean;
  playlist: Track[];
  volume: number;

  // UI 状态
  visualizerSceneId: string;

  // 播放控制
  play: (song: Track) => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (time: number) => void;
  setVolume: (v: number) => void;
  setPlaylist: (list: Track[]) => void;
  /** 整列入队并从指定下标开始播放（排行榜/歌单场景） */
  playQueueFrom: (list: Track[], index: number) => void;

  // UI 控制
  setVisualizerScene: (id: string) => void;
}

export const useMusicStore = create<MusicStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentSong: null,
      isPlaying: false,
      playlist: songs,
      volume: 0.7,

      visualizerSceneId: 'circular',

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
        const { playlist, currentSong } = get();
        if (playlist.length === 0) return;

        const currentIndex = currentSong
          ? playlist.findIndex((s) => s.id === currentSong.id)
          : -1;
        // findIndex -1（当前歌不在列表中）时兜底到列表头
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % playlist.length;
        set({ currentSong: playlist[nextIndex], isPlaying: true });
      },

      prev: () => {
        const { playlist, currentSong } = get();
        if (playlist.length === 0) return;

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

      setPlaylist: (list: Track[]) => set({ playlist: list }),

      playQueueFrom: (list: Track[], index: number) => {
        if (list.length === 0) return;
        const safeIndex = Math.max(0, Math.min(index, list.length - 1));
        set({ playlist: list, currentSong: list[safeIndex], isPlaying: true });
      },

      setVisualizerScene: (id: string) => set({ visualizerSceneId: id }),
    }),
    {
      name: 'yafeng-music-player',
      // 只持久化低敏感、可恢复的状态；isPlaying 不持久化（自动播放策略）
      partialize: (state) => ({
        currentSong: state.currentSong,
        playlist: state.playlist,
        volume: state.volume,
        visualizerSceneId: state.visualizerSceneId,
      }),
    }
  )
);
