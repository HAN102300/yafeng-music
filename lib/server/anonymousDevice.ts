/**
 * 网易云匿名设备身份（对齐 NeteaseCloudMusicApi 的 register_anonimous 机制）
 * 网易对无设备指纹的请求风控（扫码确认时报 8821「请切换其他登录方式或升级新版本」）。
 * 启动后首次调用时注册一次匿名设备（deviceId + XOR-MD5 校验），缓存 MUSIC_A，
 * 之后所有上游请求附加完整设备指纹 Cookie——与 YesPlayMusic 后端行为一致。
 */
import { createHash, randomBytes } from 'crypto';

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
  if (pending) return pending;
  pending = (async () => {
    try {
      const deviceId = randomHex52();
      const csrf = deviceId.slice(0, 32).toLowerCase();
      const buildver = Math.floor(Date.now() / 1000 / 86400).toString(); // yyymmdd 级别即可
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
