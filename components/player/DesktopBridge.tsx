'use client';

/**
 * 桌面端桥接（Tauri 环境）
 * Rust 托盘/媒体事件 → window.__YAFENG_DESKTOP_CMD__ 全局分发器 → store 指令
 * Web 环境静默跳过（无 __TAURI_INTERNALS__）
 */
import { useEffect } from 'react';
import { useMusicStore } from '@/lib/store';

export type DesktopCommand = 'toggle-play' | 'next' | 'prev';

declare global {
  interface Window {
    __YAFENG_DESKTOP_CMD__?: (cmd: DesktopCommand) => void;
  }
}

export function DesktopBridge() {
  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (!isTauri) return;

    // 桌面端启动：从 Store 文件恢复登录态到 localStorage（api 层统一读 localStorage）
    void (async () => {
      try {
        const { load } = await import('@tauri-apps/plugin-store');
        const s = await load('yafeng-data.json', { autoSave: false });
        const musicU = (await s.get<string | null>('auth:music-u')) ?? null;
        const profile = (await s.get<string | null>('auth:profile')) ?? null;
        if (musicU && !localStorage.getItem('yafeng-ncm-music-u')) {
          localStorage.setItem('yafeng-ncm-music-u', musicU);
          if (profile) localStorage.setItem('yafeng-ncm-profile', profile);
          // 通知订阅者（Navbar 等刷新登录 UI）
          window.dispatchEvent(new Event('yafeng-auth-restored'));
        }
      } catch (err) {
        console.error('[DesktopBridge] auth restore failed', err);
      }
    })();

    window.__YAFENG_DESKTOP_CMD__ = (cmd: DesktopCommand) => {
      const store = useMusicStore.getState();
      switch (cmd) {
        case 'toggle-play':
          if (store.currentSong) store.togglePlay();
          break;
        case 'next':
          if (store.currentSong) store.next();
          break;
        case 'prev':
          if (store.currentSong) store.prev();
          break;
      }
    };

    return () => {
      window.__YAFENG_DESKTOP_CMD__ = undefined;
    };
  }, []);

  return null;
}
