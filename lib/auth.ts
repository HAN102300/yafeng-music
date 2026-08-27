'use client';

/**
 * 本地账号系统（localStorage，无后端）
 * - 注册：用户名 + 密码（密码做简单散列存储，仅演示用途）
 * - 登录/登出：维护当前用户会话
 * 真实项目应接入后端鉴权；此处提供可用交互闭环。
 */

const USERS_KEY = 'yafeng-users';
const SESSION_KEY = 'yafeng-session';

export interface LocalUser {
  username: string;
  passwordHash: string;
}

export function getUsers(): LocalUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as LocalUser[]) : [];
  } catch {
    return [];
  }
}

export function getSession(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

function saveUsers(users: LocalUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** 简单的字符串散列（非安全，仅避免明文存储） */
function hashPassword(pw: string): string {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) {
    h = (h * 33) ^ pw.charCodeAt(i);
  }
  return (h >>> 0).toString(36) + '-' + pw.length;
}

export function register(username: string, password: string): { ok: boolean; error?: string } {
  const name = username.trim();
  if (!name || !password) return { ok: false, error: '用户名和密码不能为空' };
  if (name.length < 2) return { ok: false, error: '用户名至少 2 个字符' };
  if (password.length < 6) return { ok: false, error: '密码至少 6 位' };

  const users = getUsers();
  if (users.some((u) => u.username === name)) return { ok: false, error: '用户名已存在' };

  users.push({ username: name, passwordHash: hashPassword(password) });
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, name);
  return { ok: true };
}

export function login(username: string, password: string): { ok: boolean; error?: string } {
  const name = username.trim();
  const user = getUsers().find((u) => u.username === name);
  if (!user) return { ok: false, error: '用户不存在，请先注册' };
  if (user.passwordHash !== hashPassword(password)) return { ok: false, error: '密码错误' };

  localStorage.setItem(SESSION_KEY, name);
  return { ok: true };
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}
