/**
 * 网易云匿名设备身份（对齐 NeteaseCloudMusicApi 的 register_anonimous 机制）
 * 网易对无设备指纹的请求风控（扫码确认时报 8821「请切换其他登录方式或升级新版本」）。
 * 首次调用时注册一次匿名设备（deviceId + XOR-MD5 校验），缓存 MUSIC_A，
 * 之后所有上游请求附加完整设备指纹 Cookie——与 YesPlayMusic 后端行为一致。
 *
 * 持久化：桌面端 sidecar 通过 TAURI_DATA_DIR 环境变量拿到 userData 目录，
 * 设备身份写入 anonymous-device.json 并跨重启复用——频繁注册新设备本身就是
 * 风控信号，持久化复用可显著降低 8821 概率。Web/dev 环境退化为内存缓存。
 */
import { createHash, randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const ID_XOR_KEY = '3go8&$8*3*3h0k(2)2';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

interface AnonDevice {
  deviceId: string;
  csrf: string;
  musicA: string;
  cookie: string;
}

let cached: AnonDevice | null = null;
let pending: Promise<AnonDevice | null> | null = null;

/** 桌面端持久化文件路径（TAURI_DATA_DIR 由 lib.rs spawn sidecar 时注入） */
function persistPath(): string | null {
  const dir = process.env.TAURI_DATA_DIR;
  if (!dir) return null;
  try {
    mkdirSync(dir, { recursive: true });
    return join(dir, 'anonymous-device.json');
  } catch {
    return null;
  }
}

/** 从磁盘读已注册的设备身份（存在即复用，不再注册） */
function loadPersisted(): AnonDevice | null {
  const p = persistPath();
  if (!p || !existsSync(p)) return null;
  try {
    const raw = JSON.parse(readFileSync(p, 'utf8')) as Partial<AnonDevice>;
    if (raw.deviceId && raw.csrf && raw.musicA && raw.cookie) return raw as AnonDevice;
  } catch { /* 损坏文件按无处理 */ }
  return null;
}

function persist(d: AnonDevice): void {
  const p = persistPath();
  if (!p) return;
  try {
    writeFileSync(p, JSON.stringify(d), 'utf8');
  } catch { /* 写失败退化为内存缓存 */ }
}

/** XOR 后 MD5 再 Base64（网易云音乐 DLL 校验算法） */
function dllEncodeId(someId: string): string {
  let xored = '';
  for (let i = 0; i < someId.length; i++) {
    xored += String.fromCharCode(
      someId.charCodeAt(i) ^ ID_XOR_KEY.charCodeAt(i % ID_XOR_KEY.length)
    );
  }
  return createHash('md5').update(xored, 'utf8').digest('base64');
}

function randomHex52(): string {
  const chars = '0123456789ABCDEF';
  return Array.from({ length: 52 }, () => chars[Math.floor(Math.random() * 16)]).join('');
}

/** 注册匿名设备并缓存。失败返回 null（调用方降级为无指纹请求） */
export async function ensureAnonymousDevice(): Promise<AnonDevice | null> {
  if (cached) return cached;
  // 进程内无缓存：先尝试磁盘复用（桌面端跨重启同一设备身份）
  const persisted = loadPersisted();
  if (persisted) {
    cached = persisted;
    return cached;
  }
  if (pending) return pending;
  pending = (async () => {
    try {
      const deviceId = randomHex52();
      const csrf = deviceId.slice(0, 32).toLowerCase();
      const deviceCookie =
        `osver=Windows%2010%3B%3B%3B${randomBytes(8).toString('hex')}; ` +
        `deviceId=${deviceId}; os=pc; appver=3.0.2; versioncode=300; ` +
        `resolution=1920x1080; __csrf=${csrf}; channel=netease; buildver=${Math.floor(Date.now() / 86400000)}`;
      const encodedId = Buffer.from(
        `${deviceId} ${dllEncodeId(deviceId)}`,
        'utf-8'
      ).toString('base64');
      const res = await fetch('https://music.163.com/api/register/anonimous', {
        method: 'POST',
        headers: {
          'User-Agent': UA,
          Referer: 'https://music.163.com',
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: deviceCookie,
        },
        body: new URLSearchParams({ username: encodedId }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie().join(';') : '';
      const musicA =
        /MUSIC_A=([^;\s"']+)/.exec(setCookie)?.[1] ??
        /MUSIC_A=([^;\s"']+)/.exec(await res.text())?.[1];
      if (!musicA) return null;
      cached = {
        deviceId,
        csrf,
        musicA,
        cookie: `${deviceCookie}; MUSIC_A=${musicA}`,
      };
      persist(cached);
      return cached;
    } catch (err) {
      console.error('[anonymousDevice] register failed', err);
      return null;
    } finally {
      pending = null;
    }
  })();
  return pending;
}

/** 返回当前匿名设备 Cookie（未注册时为空字符串） */
export function getAnonymousCookie(): string {
  return cached?.cookie ?? '';
}

/** 请求头（UA + Referer + 匿名指纹 Cookie） */
export function anonymousHeaders(): Record<string, string> {
  const base: Record<string, string> = {
    'User-Agent': UA,
    Referer: 'https://music.163.com',
  };
  const cookie = getAnonymousCookie();
  if (cookie) base['Cookie'] = cookie;
  return base;
}

/**
 * 组装带登录态的上游 Cookie：
 * MUSIC_U（登录态）与设备指纹（osver/deviceId/MUSIC_A）叠加——
 * 网易对只带 MUSIC_U 的裸请求也会风控（如 /v1/radio/get 静默返回空 data）。
 */
export function mergeUpstreamCookie(musicU?: string | null): string | undefined {
  const parts: string[] = [];
  const fingerprint = getAnonymousCookie();
  if (fingerprint) parts.push(fingerprint);
  if (musicU && musicU.trim()) parts.push(`MUSIC_U=${musicU.trim()}`);
  return parts.length ? parts.join('; ') : undefined;
}
