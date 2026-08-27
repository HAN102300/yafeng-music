/**
 * 网易云音乐服务端代理（仅服务端运行）
 *
 * 通过公开接口 + weapi 加密实现「搜索 / 歌词 / 播放地址」三件事，
 * 解决浏览器直连的 CORS 问题，并统一收敛非官方接口的调用点。
 * 仅供学习研究，不缓存、不持久化任何版权内容。
 */
import { createCipheriv, randomBytes } from 'crypto';

const MODULUS =
  '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';
const PUB_KEY = '010001';
const NONCE = '0CoJUm6Qyw8W8jud';
const IV = '0102030405060708';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REFERER = 'https://music.163.com';

export interface NetEaseSong {
  /** 网易云歌曲 id */
  id: number;
  name: string;
  artists: string;
  album: string;
  cover: string;
  /** 时长（毫秒） */
  duration: number;
  /** 版权标记：0/8 免费，1/4 VIP（仅试听） */
  fee: number;
}

export interface SongUrlResult {
  url: string;
  /** 码率（bps） */
  br: number;
  fee: number;
}

// ---------- weapi 加密 ----------

function aesEncrypt(text: string, secKey: string): string {
  const cipher = createCipheriv('aes-128-cbc', Buffer.from(secKey), Buffer.from(IV));
  return Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('base64');
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let r = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) r = (r * base) % mod;
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return r;
}

function rsaEncrypt(text: string): string {
  const reversed = Buffer.from(text.split('').reverse().join(''));
  const m = BigInt('0x' + reversed.toString('hex'));
  const c = modPow(m, BigInt('0x' + PUB_KEY), BigInt('0x' + MODULUS));
  return c.toString(16).padStart(256, '0');
}

function weapi(object: object): { params: string; encSecKey: string } {
  const text = JSON.stringify(object);
  const bytes = randomBytes(16);
  let secKey = '';
  for (const b of bytes) secKey += 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36];
  const params = aesEncrypt(aesEncrypt(text, NONCE), secKey);
  const encSecKey = rsaEncrypt(secKey);
  return { params, encSecKey };
}

/** 统一 http→https，避免混合内容被浏览器拦截 */
function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://');
}

// ---------- 公开接口 ----------

/** 搜索歌曲 */
export async function searchNetEase(keyword: string, limit = 30): Promise<NetEaseSong[]> {
  const q = encodeURIComponent(keyword);
  const res = await fetch(
    `https://music.163.com/api/search/get/web?s=${q}&type=1&limit=${limit}&offset=0`,
    { headers: { 'User-Agent': UA, Referer: REFERER }, cache: 'no-store' }
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    result?: { songs?: RawSearchSong[] };
  };
  const songs = json?.result?.songs ?? [];
  return songs.map((s) => ({
    id: s.id,
    name: s.name,
    artists: (s.artists ?? []).map((a) => a.name).join(' / '),
    album: s.album?.name ?? '',
    cover:
      s.album?.picUrl ||
      s.album?.blurPicUrl ||
      s.album?.artist?.img1v1Url ||
      '/images/播放.png',
    duration: s.duration ?? 0,
    fee: s.fee ?? 0,
  }));
}

/** 获取歌词（LRC 文本），失败返回 null */
export async function getLyricNetEase(id: number): Promise<string | null> {
  const res = await fetch(
    `https://music.163.com/api/song/lyric?id=${id}&lv=1&kv=1&tv=-1`,
    { headers: { 'User-Agent': UA, Referer: REFERER }, cache: 'no-store' }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { lrc?: { lyric?: string } };
  return json?.lrc?.lyric ?? null;
}

/** 获取播放地址（weapi） */
export async function getSongUrlNetEase(id: number): Promise<SongUrlResult | null> {
  const { params, encSecKey } = weapi({
    ids: `[${id}]`,
    level: 'standard',
    encodeType: 'mp3',
    csrf_token: '',
  });
  const body = new URLSearchParams({ params, encSecKey });
  const res = await fetch(
    'https://music.163.com/weapi/song/enhance/player/url/v1?csrf_token=',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        Referer: REFERER,
      },
      body,
      cache: 'no-store',
    }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: RawUrlData[] };
  const d = json?.data?.[0];
  if (!d?.url || d.code !== 200) return null;
  return { url: toHttps(d.url), br: d.br ?? 128000, fee: d.fee ?? 0 };
}

// ---------- 原始结构类型 ----------

interface RawSearchSong {
  id: number;
  name: string;
  artists?: { name: string }[];
  album?: {
    name?: string;
    picUrl?: string;
    blurPicUrl?: string;
    artist?: { img1v1Url?: string };
  };
  duration?: number;
  fee?: number;
}

interface RawUrlData {
  url?: string;
  code?: number;
  br?: number;
  fee?: number;
}
