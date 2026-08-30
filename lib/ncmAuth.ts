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

export function getMusicU(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY_MUSIC_U);
}

export function getProfile(): NcmProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEY_PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NcmProfile;
  } catch {
    return null;
  }
}

/** 登录成功：写入 MUSIC_U 与账号信息 */
export function saveLogin(musicU: string, profile: NcmProfile): void {
  localStorage.setItem(KEY_MUSIC_U, musicU);
  localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
  emit();
}

/** 退出登录 */
export function clearLogin(): void {
  localStorage.removeItem(KEY_MUSIC_U);
  localStorage.removeItem(KEY_PROFILE);
  emit();
}

/** 用 MUSIC_U 向服务端换取账号信息（扫码 803 后调用）。
 * 账号接口偶发失败时重试一次；仍失败则保留 MUSIC_U 登录态并使用通用昵称兜底，
 * 避免用户扫码确认成功后还被要求重新扫码。 */
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
    localStorage.setItem(KEY_PROFILE, JSON.stringify(fallback));
    emit();
    return fallback;
  }
  localStorage.setItem(KEY_PROFILE, JSON.stringify(account));
  emit();
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
