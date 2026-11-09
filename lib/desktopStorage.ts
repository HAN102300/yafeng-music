/**
 * zustand persist 自定义存储：桌面端走 Tauri Store 文件（userData 目录），
 * Web 端回退 localStorage。与 origin/端口无关，桌面重启/升级均保留。
 */
import type { StateStorage } from 'zustand/middleware';
import { load as loadTauriStore } from '@tauri-apps/plugin-store';

type TauriStoreInstance = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
  save: () => Promise<void>;
};

let storeInstance: TauriStoreInstance | null = null;
let storeInitPromise: Promise<TauriStoreInstance | null> | null = null;
const memoryCache = new Map<string, string>();

/** 懒加载 Tauri Store（仅桌面环境；web 端静默失败回退 localStorage） */
async function getStore(): Promise<TauriStoreInstance | null> {
  if (storeInstance) return storeInstance;
  if (storeInitPromise) return storeInitPromise;
  storeInitPromise = (async () => {
    try {
      if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return null;
      // load 默认存 userData 目录下的 json 文件
      const s = await loadTauriStore('yafeng-data.json', { autoSave: false });
      storeInstance = s as unknown as TauriStoreInstance;
      return storeInstance;
    } catch (err) {
      console.error('[desktopStorage] init failed', err);
      return null;
    }
  })();
  return storeInitPromise;
}

export const desktopStorage: StateStorage = {
  async getItem(name) {
    const s = await getStore();
    if (s) {
      const v = (await s.get(name)) as string | null | undefined;
      return v ?? null;
    }
    if (typeof window === 'undefined') return memoryCache.get(name) ?? null;
    return localStorage.getItem(name);
  },

  async setItem(name, value) {
    const s = await getStore();
    if (s) {
      await s.set(name, value);
      await s.save().catch((e: unknown) => console.error('[desktopStorage] save failed', e));
      return;
    }
    if (typeof window === 'undefined') {
      memoryCache.set(name, value);
      return;
    }
    localStorage.setItem(name, value);
  },

  async removeItem(name) {
    const s = await getStore();
    if (s) {
      await s.set(name, null);
      await s.save().catch(() => {});
      return;
    }
    if (typeof window === 'undefined') {
      memoryCache.delete(name);
      return;
    }
    localStorage.removeItem(name);
  },
};
