'use client';

/**
 * 网易云扫码登录态（客户端存储）
 * MUSIC_U 存 localStorage，每次 API 调用经 apiFetch 以 x-ncm-music-u 头透传给服务端。
 * 个人学习项目可接受的安全边界：与账号绑定的只读 token，不落服务端。
 */
import { useSyncExternalStore } from 'react';
import { fetchAccount, type NcmAccount } from './api';

const KEY_MUSIC_U = 'yafeng-ncm-music-u';
const KEY_PROFILE = 'yafeng-ncm-profile';

export interface NcmProfile {
  userId: number;
  nickname: string;
  avatarUrl: string;
}

// 轻量订阅：登录/登出时通知 Navbar 等订阅者刷新
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// 进程内快照缓存：useSyncExternalStore 的 getSnapshot 必须返回稳定引用，
// 每次调用都 JSON.parse 会产生新对象 → React 判定快照持续变更 → 无限重渲染崩溃。
// undefined 表示尚未从 localStorage 水合；引用仅在登录/登出时更换。
let profileCache: NcmProfile | null | undefined;

function hydrateProfile(): NcmProfile | null {
  if (typeof window === 'undefined') return null;
  if (profileCache !== undefined) return profileCache;
  const raw = localStorage.getItem(KEY_PROFILE);
  let next: NcmProfile | null = null;
  if (raw) {
    try {
      next = JSON.parse(raw) as NcmProfile;
    } catch {
      next = null;
    }
  }
  profileCache = next;
  return next;
}

export function getMusicU(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY_MUSIC_U);
}

export function getProfile(): NcmProfile | null {
  return hydrateProfile();
}

/** 登录成功：写入 MUSIC_U 与账号信息 */
export function saveLogin(musicU: string, profile: NcmProfile): void {
  localStorage.setItem(KEY_MUSIC_U, musicU);
  localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
  profileCache = { ...profile }; // 新引用让订阅者拿到变更
  emit();
}

/** 退出登录 */
export function clearLogin(): void {
  localStorage.removeItem(KEY_MUSIC_U);
  localStorage.removeItem(KEY_PROFILE);
  profileCache = null;
  emit();
}

/** 用 MUSIC_U 向服务端换取账号信息（扫码/Cookie/短信登录成功后调用）。
 * 账号接口偶发失败时重试一次；仍失败则保留 MUSIC_U 登录态并使用通用昵称兜底，
 * 避免用户确认成功后还被要求重新登录。 */
export async function loginWithMusicU(musicU: string): Promise<NcmAccount | null> {
  localStorage.setItem(KEY_MUSIC_U, musicU); // 先写入以便 fetchAccount 透传
  let account = await fetchAccount();
  if (!account) {
    account = await fetchAccount();
  }
  if (!account) {
    const fallback: NcmProfile = {
      userId: 0,
      nickname: '网易云音乐用户',
      avatarUrl: '/images/播放.png',
    };
    saveLogin(musicU, fallback);
    return fallback;
  }
  saveLogin(musicU, account);
  return account;
}

/** React Hook：当前是否已登录（跨组件响应登录/登出） */
export function useNcmProfile(): NcmProfile | null {
  return useSyncExternalStore(
    subscribeAuth,
    getProfile,
    () => null
  );
}
