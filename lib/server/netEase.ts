/**
 * 网易云音乐服务端代理（仅服务端运行）
 *
 * 通过公开接口 + weapi 加密实现「搜索 / 歌词 / 播放地址 / 榜单 / 歌单 /
 * 歌手 / 推荐 / 扫码登录」等全量只读能力，解决浏览器直连的 CORS 问题，
 * 并统一收敛非官方接口的调用点。仅供学习研究，不缓存、不持久化任何版权内容。
 */
import { createCipheriv, randomBytes } from 'crypto';
import { anonymousHeaders, ensureAnonymousDevice, mergeUpstreamCookie } from './anonymousDevice';

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

/** 歌单/榜单（归一化） */
export interface NetEasePlaylist {
  id: number;
  name: string;
  cover: string;
  playCount: number;
  trackCount: number;
  creator?: string;
  /** 创建者用户 id（区分自己创建/收藏的歌单） */
  creatorId?: number;
  description?: string;
}

/** 专辑（归一化） */
export interface NetEaseAlbum {
  id: number;
  name: string;
  cover: string;
  artist?: string;
  company?: string;
  /** 出版毫秒时间戳 */
  publishTime?: number;
  description?: string;
}

/** 歌手（归一化） */
export interface NetEaseArtist {
  id: number;
  name: string;
  avatar: string;
  /** 歌曲数 / 别名等附加信息 */
  musicSize?: number;
  alias?: string;
  briefDesc?: string;
}

/** 官方榜单（归一化） */
export interface NetEaseToplist {
  id: number;
  name: string;
  cover: string;
  updateFrequency: string;
  /** 前几名预览：[歌名, 歌手] */
  tracks: { first: string; second: string }[];
}

/** 音质档位（无损/Hires 需黑胶 VIP，游客与普通账号自动回落 standard） */
export type SongQuality = 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires';

/** 扫码登录轮询结果 */
export interface QrCheckResult {
  /** 800 二维码过期 / 801 等待扫码 / 802 已扫码待确认 / 803 登录成功 */
  code: number;
  /** 登录成功时携带（从 Set-Cookie 提取） */
  musicU?: string;
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

/** 上游请求统一超时，避免 music.163.com 挂起拖死 Route Handler */
const UPSTREAM_TIMEOUT_MS = 8000;

async function upstreamFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
}

// ---------- 公开接口 ----------

/** 搜索歌曲 */
export async function searchNetEase(keyword: string, limit = 30): Promise<NetEaseSong[]> {
  const q = encodeURIComponent(keyword);
  const res = await upstreamFetch(
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
    cover: toHttps(
      s.album?.picUrl || s.album?.blurPicUrl || s.album?.artist?.img1v1Url || '/images/播放.png'
    ),
    duration: s.duration ?? 0,
    fee: s.fee ?? 0,
  }));
}

/** 获取歌词（LRC 文本），失败返回 null */
export async function getLyricNetEase(id: number): Promise<string | null> {
  const res = await upstreamFetch(
    `https://music.163.com/api/song/lyric?id=${id}&lv=1&kv=1&tv=-1`,
    { headers: { 'User-Agent': UA, Referer: REFERER }, cache: 'no-store' }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { lrc?: { lyric?: string } };
  return json?.lrc?.lyric ?? null;
}

/** 获取播放地址（weapi）。level 指定音质档位，无权限时上游自动回落 */
export async function getSongUrlNetEase(
  id: number,
  level: SongQuality = 'standard'
): Promise<SongUrlResult | null> {
  const { params, encSecKey } = weapi({
    ids: `[${id}]`,
    level,
    encodeType: 'flac',
    csrf_token: '',
  });
  const body = new URLSearchParams({ params, encSecKey });
  const res = await upstreamFetch(
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
  if (!d || d.code !== 200) return null;
  // 无 url 但有元数据：仍返回 fee（VIP=1/4），供上层区分「VIP 专属」「版权下架」
  if (!d.url) return { url: '', br: d.br ?? 0, fee: d.fee ?? 0 };
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

// ---------- 通用原始结构 / 映射 ----------

/** v3 song/detail 与 artist hotSongs 的歌曲结构（ar/al 缩写） */
interface RawSongV3 {
  id: number;
  name?: string;
  dt?: number;
  /** 老结构字段名（personalized/newsong 等） */
  duration?: number;
  fee?: number;
  ar?: { name?: string }[];
  artists?: { name?: string }[];
  al?: { name?: string; picUrl?: string; blurPicUrl?: string };
  album?: { name?: string; picUrl?: string; blurPicUrl?: string };
}

function mapSongV3(s: RawSongV3): NetEaseSong {
  const artistList = s.ar ?? s.artists ?? [];
  const album = s.al ?? s.album;
  return {
    id: s.id,
    name: s.name ?? '未知歌曲',
    artists: artistList.map((a) => a.name ?? '').filter(Boolean).join(' / ') || '未知歌手',
    album: album?.name ?? '',
    cover: toHttps(album?.picUrl || album?.blurPicUrl || '/images/播放.png'),
    duration: s.dt ?? s.duration ?? 0,
    fee: s.fee ?? 0,
  };
}

interface RawPlaylist {
  id: number;
  name?: string;
  coverImgUrl?: string;
  playCount?: number;
  trackCount?: number;
  description?: string;
  creator?: { nickname?: string; userId?: number };
  /** personalized 接口字段 */
  picUrl?: string;
  songCount?: number;
}

function mapPlaylist(p: RawPlaylist): NetEasePlaylist {
  return {
    id: p.id,
    name: p.name ?? '未命名歌单',
    cover: toHttps(p.coverImgUrl || p.picUrl || '/images/播放.png'),
    playCount: p.playCount ?? 0,
    trackCount: p.trackCount ?? p.songCount ?? 0,
    creator: p.creator?.nickname,
    creatorId: p.creator?.userId,
    description: p.description,
  };
}

interface RawArtist {
  id: number;
  name?: string;
  picUrl?: string;
  img1v1Url?: string;
  alias?: string[];
  musicSize?: number;
  briefDesc?: string;
  /** toplist 内嵌歌手头像 */
  cover?: string;
}

function mapArtist(a: RawArtist): NetEaseArtist {
  return {
    id: a.id,
    name: a.name ?? '未知歌手',
    avatar: toHttps(a.picUrl || a.img1v1Url || a.cover || '/images/播放.png'),
    musicSize: a.musicSize,
    alias: (a.alias ?? []).filter(Boolean).join(' / ') || undefined,
    briefDesc: a.briefDesc,
  };
}

/** 登录态请求头（MUSIC_U 透传） */
function authHeaders(musicU?: string | null): Record<string, string> {
  const h: Record<string, string> = { 'User-Agent': UA, Referer: REFERER };
  // 设备指纹 + 登录态叠加：只带 MUSIC_U 的裸请求网易也风控
  // （如 /v1/radio/get 会静默返回空 data，表现为 FM「已登录却拿不到歌」）
  const cookie = mergeUpstreamCookie(musicU);
  if (cookie) h.Cookie = cookie;
  return h;
}

/** weapi POST（可带登录态；请求前确保匿名设备指纹就绪） */
async function weapiPost<T>(
  path: string,
  data: object,
  musicU?: string | null
): Promise<T | null> {
  await ensureAnonymousDevice();
  const { params, encSecKey } = weapi(data);
  const body = new URLSearchParams({ params, encSecKey });
  const res = await upstreamFetch(`https://music.163.com${path}`, {
    method: 'POST',
    headers: { ...authHeaders(musicU), 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/**
 * 明文 GET 通道（可带登录态）。
 * 2026-11 起网易对 weapi 加密通道全面收紧（登录态+完整设备指纹仍静默空 body），
 * 明文 /api/ 通道实测稳定可用——需登录的接口一律优先走此通道。
 */
async function apiGet<T>(path: string, musicU?: string | null): Promise<T | null> {
  await ensureAnonymousDevice();
  const res = await upstreamFetch(`https://music.163.com${path}`, {
    headers: authHeaders(musicU),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

// ---------- 榜单 ----------

/** 全部官方榜单（飙升/新歌/热歌/原创…）。预览曲目可能为空，详情走歌单详情接口 */
export async function getToplistNetEase(): Promise<NetEaseToplist[]> {
  const res = await upstreamFetch('https://music.163.com/api/toplist', {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    list?: {
      id: number;
      name?: string;
      coverImgUrl?: string;
      updateFrequency?: string;
      tracks?: { first?: string; second?: string }[] | null;
    }[];
  };
  return (json?.list ?? []).map((t) => ({
    id: t.id,
    name: t.name ?? '未知榜单',
    cover: toHttps(t.coverImgUrl || '/images/播放.png'),
    updateFrequency: t.updateFrequency ?? '',
    tracks: (t.tracks ?? []).slice(0, 5).map((s) => ({
      first: s.first ?? '',
      second: s.second ?? '',
    })),
  }));
}

// ---------- 歌单 ----------

/** 批量取歌曲详情（weapi v3 song/detail，上限 ~1000） */
async function getSongsDetailNetEase(ids: number[], musicU?: string | null): Promise<NetEaseSong[]> {
  if (ids.length === 0) return [];
  const json = await weapiPost<{ songs?: RawSongV3[] }>(
    '/weapi/v3/song/detail',
    {
      c: JSON.stringify(ids.slice(0, 1000).map((id) => ({ id }))),
      ids: JSON.stringify(ids.slice(0, 1000)),
      csrf_token: '',
    },
    musicU
  );
  return (json?.songs ?? []).map(mapSongV3);
}

/** 歌单详情：元信息 + 分页曲目（榜单详情复用此接口，weapi v6） */
export async function getPlaylistDetailNetEase(
  id: number,
  limit = 100,
  offset = 0,
  musicU?: string | null
): Promise<{ playlist: NetEasePlaylist; songs: NetEaseSong[]; total: number } | null> {
  const json = await weapiPost<{
    playlist?: RawPlaylist & {
      trackIds?: { id: number }[];
      /** n=1000 时上游可能直接内嵌完整曲目 */
      tracks?: RawSongV3[];
    };
  }>('/weapi/v6/playlist/detail', { id, n: 1000, s: 8, csrf_token: '' }, musicU);
  const raw = json?.playlist;
  if (!raw) return null;

  const trackIds = (raw.trackIds ?? []).map((t) => t.id);
  const pageIds = trackIds.slice(offset, offset + limit);

  // 优先使用内嵌 tracks；否则按页批量取歌曲详情
  let songs: NetEaseSong[];
  if (Array.isArray(raw.tracks) && raw.tracks.length > 0 && offset === 0) {
    const byId = new Map(raw.tracks.map((s) => [s.id, mapSongV3(s)]));
    songs = pageIds.map((pid) => byId.get(pid)).filter((s): s is NetEaseSong => !!s);
  } else {
    songs = await getSongsDetailNetEase(pageIds, musicU);
  }

  return { playlist: mapPlaylist(raw), songs, total: trackIds.length || raw.trackCount || 0 };
}

/** 热门歌单（按分类，order=hot） */
export async function getPlaylistListNetEase(
  cat = '全部',
  limit = 35,
  offset = 0,
  highquality = false
): Promise<{ playlists: NetEasePlaylist[]; more: boolean }> {
  const path = highquality
    ? `https://music.163.com/api/playlist/highquality/list?cat=${encodeURIComponent(cat)}&limit=${limit}`
    : `https://music.163.com/api/playlist/list?cat=${encodeURIComponent(cat)}&limit=${limit}&offset=${offset}&order=hot&total=true`;
  const res = await upstreamFetch(path, { headers: authHeaders(), cache: 'no-store' });
  if (!res.ok) return { playlists: [], more: false };
  const json = (await res.json()) as { playlists?: RawPlaylist[]; more?: boolean };
  return {
    playlists: (json?.playlists ?? []).map(mapPlaylist),
    more: json?.more ?? false,
  };
}

/** 歌单分类目录 */
export async function getPlaylistCatalogueNetEase(): Promise<{ name: string; hot: boolean }[]> {
  const res = await upstreamFetch('https://music.163.com/api/playlist/catalogue', {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { sub?: { name?: string; hot?: boolean }[] };
  return (json?.sub ?? [])
    .filter((s) => !!s.name)
    .map((s) => ({ name: s.name!, hot: !!s.hot }));
}

// ---------- 歌手 ----------

/** 歌手详情 + 热门歌曲 */
export async function getArtistNetEase(
  id: number,
  musicU?: string | null
): Promise<{ artist: NetEaseArtist; songs: NetEaseSong[] } | null> {
  const res = await upstreamFetch(`https://music.163.com/api/v1/artist/${id}`, {
    headers: authHeaders(musicU),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    artist?: RawArtist;
    hotSongs?: RawSongV3[];
  };
  if (!json?.artist) return null;
  return {
    artist: mapArtist(json.artist),
    songs: (json.hotSongs ?? []).map(mapSongV3),
  };
}

/** 热门歌手列表 */
export async function getTopArtistsNetEase(limit = 30, offset = 0): Promise<NetEaseArtist[]> {
  const res = await upstreamFetch(
    `https://music.163.com/api/artist/top?limit=${limit}&offset=${offset}&total=true`,
    { headers: authHeaders(), cache: 'no-store' }
  );
  if (!res.ok) return [];
  const json = (await res.json()) as { artists?: RawArtist[] };
  return (json?.artists ?? []).map(mapArtist);
}

// ---------- 推荐 / 热搜（免登录） ----------

/** 个性化推荐歌单（weapi） */
export async function getPersonalizedNetEase(limit = 10): Promise<NetEasePlaylist[]> {
  const json = await weapiPost<{ result?: RawPlaylist[] }>(
    '/weapi/personalized/playlist',
    { limit, offset: 0, total: true, n: 1000, csrf_token: '' }
  );
  return (json?.result ?? []).map(mapPlaylist);
}

/** 推荐新歌（weapi，返回键为 result，元素内嵌 song） */
export async function getPersonalizedNewSongNetEase(limit = 12): Promise<NetEaseSong[]> {
  const json = await weapiPost<{
    result?: { song?: RawSongV3 }[];
    data?: { song?: RawSongV3 }[];
  }>('/weapi/personalized/newsong', { type: 'recommend', limit, areaId: 0, csrf_token: '' });
  return ((json?.result ?? json?.data) ?? [])
    .map((r) => r.song)
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map(mapSongV3);
}

/** 热搜词（weapi /weapi/search/hot，result.hots[].first） */
export async function getSearchHotNetEase(): Promise<string[]> {
  const json = await weapiPost<{ result?: { hots?: { first?: string }[] } }>(
    '/weapi/search/hot',
    { type: 1111 }
  );
  return (json?.result?.hots ?? [])
    .map((h) => h.first ?? '')
    .filter(Boolean)
    .slice(0, 12);
}

// ---------- 搜索扩展（歌手 / 歌单） ----------

export async function searchArtistsNetEase(keyword: string, limit = 20): Promise<NetEaseArtist[]> {
  const q = encodeURIComponent(keyword);
  const res = await upstreamFetch(
    `https://music.163.com/api/search/get/web?s=${q}&type=100&limit=${limit}`,
    { headers: authHeaders(), cache: 'no-store' }
  );
  if (!res.ok) return [];
  const json = (await res.json()) as { result?: { artists?: RawArtist[] } };
  return (json?.result?.artists ?? []).map(mapArtist);
}

export async function searchPlaylistsNetEase(
  keyword: string,
  limit = 20
): Promise<NetEasePlaylist[]> {
  const q = encodeURIComponent(keyword);
  const res = await upstreamFetch(
    `https://music.163.com/api/search/get/web?s=${q}&type=1000&limit=${limit}`,
    { headers: authHeaders(), cache: 'no-store' }
  );
  if (!res.ok) return [];
  const json = (await res.json()) as { result?: { playlists?: RawPlaylist[] } };
  return (json?.result?.playlists ?? []).map(mapPlaylist);
}

// ---------- 扫码登录 ----------

/**
 * 扫码会话 cookie 罐：unikey 创建 → 轮询确认全程保持同一「浏览器会话」。
 * 真实网页流程中，打开登录页种下的 NMTID 等会随 unikey 创建与轮询一路携带；
 * 缺少这层连续性会被网易风控拦截（8821「安全环境风险」），因此按 unikey
 * 维护一个小罐，确认成功/二维码过期后即释放。
 */
const qrCookieJars = new Map<string, string>();

/** 合并响应 Set-Cookie 到 cookie 罐字符串（仅取 name=value，忽略 Path/Expires 属性段） */
function mergeCookies(jar: string, res: Response): string {
  const parts = new Set(jar.split('; ').filter(Boolean));
  const lines =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie') ?? ''];
  for (const line of lines) {
    const seg = line.split(';')[0].trim();
    if (seg && seg.includes('=')) parts.add(seg);
  }
  return [...parts].join('; ');
}

/**
 * 生成扫码登录 unikey。
 * 通道：明文 /api/ + type:3（与 NeteaseCloudMusicApi/YesPlayMusic 一致），
 * 并先 GET 首页种 cookie、unikey 响应 cookie 一并入罐。
 * （此前的明文 /api/ + type:3 桌面客户端通道已被风控拦截：手机确认后返回
 * 8821「请切换其他登录方式或升级新版本再试」+ 安全环境风险重定向）
 */
export async function createQrKeyNetEase(): Promise<string | null> {
  // 纯 api GET 通道（无需 weapi 加密与会话 cookie）。
  // 2026-11 起网易对 /weapi/login/qrcode/unikey 的无会话请求返回 200 空 body（静默拒绝），
  // /api/login/qrcode/unikey 仍正常——与 YesPlayMusic 同通道。
  try {
    await ensureAnonymousDevice(); // 首次调用时注册匿名设备（网易风控要求）
    const res = await upstreamFetch('https://music.163.com/api/login/qrcode/unikey?type=3&noCheckToken=true', {
      headers: anonymousHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { code?: number; unikey?: string };
    const key = json?.unikey ?? null;
    if (key && qrCookieJars.size > 32) {
      const oldest = qrCookieJars.keys().next().value;
      if (oldest !== undefined) qrCookieJars.delete(oldest);
    }
    if (key) qrCookieJars.set(key, '');
    return key;
  } catch {
    return null;
  }
}

/** 轮询扫码状态：api GET 通道。MUSIC_U 从 Set-Cookie 提取（803 成功时上游返回）。 */
export async function checkQrKeyNetEase(key: string): Promise<QrCheckResult & { dbg?: string }> {
  try {
    const res = await upstreamFetch(
      'https://music.163.com/api/login/qrcode/client/login?key=' + encodeURIComponent(key) + '&type=3',
      { headers: anonymousHeaders(), cache: 'no-store' }
    );
    if (!res.ok) return { code: 801 };

    const rawText = await res.text();
    const setCookieText =
      typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie().join('; ')
        : (res.headers.get('set-cookie') ?? '');

    let code: number | undefined;
    try {
      code = (JSON.parse(rawText) as { code?: number })?.code;
    } catch {
      /* body 非 JSON，走正则 */
    }
    if (code === undefined) {
      const m = /"code"\s*:\s*(\d{3})/.exec(rawText);
      if (m) code = Number(m[1]);
    }

    const musicU =
      /MUSIC_U=([^;\s"']+)/.exec(setCookieText)?.[1] ??
      /MUSIC_U=([^;\s"']+)/.exec(rawText)?.[1];

    if (code === 800 || (code === 803 && musicU)) qrCookieJars.delete(key);

    if (code === 803 && musicU) return { code: 803, musicU };
    if (musicU && (code === undefined || code === 200)) {
      return { code: 803, musicU };
    }

    const result: QrCheckResult & { dbg?: string } = { code: code ?? 801 };
    if (code === 803 || (code !== 800 && code !== 801 && code !== 802)) {
      result.dbg = `body=${rawText.slice(0, 200)} setCookieN=${setCookieText ? setCookieText.split(';').filter((s) => s.includes('=')).length : 0}`;
    }
    return result;
  } catch {
    return { code: 801 };
  }
}

// ---------- 手机验证码登录 ----------

export interface SmsSendResult {
  /** 短信是否已发出 */
  sent: boolean;
  /** 网易风控要求先识别图形验证码 */
  needCaptcha?: boolean;
  /** 图形验证码图（dataURL，直接用于 <img>） */
  captchaImage?: string;
  message?: string;
}

/** 获取图形验证码（发短信被风控要求时兜底），失败返回 null */
export async function getCaptchaImageNetEase(): Promise<string | null> {
  try {
    const res = await upstreamFetch('https://music.163.com/api/captcha/get?ct=code&cp=web', {
      headers: authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { captcha?: string };
    return json?.captcha ?? null;
  } catch {
    return null;
  }
}

/**
 * 发送登录短信验证码（weapi，与网页端验证码登录同通道）。
 * 上游风控要求图形验证码时返回 needCaptcha + 图片，用户识别后随下一次请求带上。
 */
export async function sendSmsCaptchaNetEase(
  phone: string,
  ctcode = '86',
  captcha?: string
): Promise<SmsSendResult> {
  const { params, encSecKey } = weapi({
    cellphone: phone,
    ctcode,
    ...(captcha ? { captcha } : {}),
  });
  let res: Response;
  try {
    res = await upstreamFetch('https://music.163.com/weapi/captcha/sent?ct=code&cp=web', {
      method: 'POST',
      headers: {
        ...authHeaders(),
        Origin: REFERER,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ params, encSecKey }),
      cache: 'no-store',
    });
  } catch {
    return { sent: false, message: '网络异常，请稍后重试' };
  }
  if (!res.ok) return { sent: false, message: '验证码发送失败，请稍后重试' };

  const rawText = await res.text();
  let body: { code?: number; sent?: boolean; message?: string; captcha?: string } = {};
  try {
    body = JSON.parse(rawText);
  } catch {
    /* body 非 JSON */
  }

  if (body.code === 200 && body.sent !== false) return { sent: true };
  // 需要图形验证码：优先用上游直接返回的图，否则现场取一张
  const image =
    body.captcha && body.captcha.includes('base64') ? body.captcha : await getCaptchaImageNetEase();
  if (image) {
    return { sent: false, needCaptcha: true, captchaImage: image, message: body.message };
  }
  return { sent: false, message: body.message ?? '验证码发送失败，请稍后重试' };
}

/** 手机号 + 短信验证码登录（weapi login/cellphone），成功返回 MUSIC_U */
export async function loginCellphoneNetEase(
  phone: string,
  captcha: string,
  ctcode = '86'
): Promise<{ musicU?: string; message?: string }> {
  const { params, encSecKey } = weapi({
    phone,
    countrycode: ctcode,
    captcha,
    rememberLogin: 'true',
  });
  let res: Response;
  try {
    res = await upstreamFetch('https://music.163.com/weapi/login/cellphone', {
      method: 'POST',
      headers: {
        ...authHeaders(),
        Origin: REFERER,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ params, encSecKey }),
      cache: 'no-store',
    });
  } catch {
    return { message: '网络异常，请稍后重试' };
  }

  const rawText = await res.text();
  const setCookieText =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie().join('; ')
      : (res.headers.get('set-cookie') ?? '');
  const musicU =
    /MUSIC_U=([^;\s"']+)/.exec(rawText)?.[1] ??
    /MUSIC_U=([^;\s"']+)/.exec(setCookieText)?.[1];
  if (musicU) return { musicU };

  let body: { message?: string } = {};
  try {
    body = JSON.parse(rawText);
  } catch {
    /* body 非 JSON */
  }
  return { message: body.message ?? '登录失败，请检查手机号与验证码' };
}

// ---------- 登录态能力 ----------

/** 当前账号信息（nickname/avatar/userId），未登录返回 null */
export async function getAccountNetEase(musicU?: string | null): Promise<{
  userId: number;
  nickname: string;
  avatarUrl: string;
} | null> {
  const json = await apiGet<{
    profile?: { userId?: number; nickname?: string; avatarUrl?: string };
  }>('/api/nuser/account/get', musicU);
  const p = json?.profile;
  if (!p?.userId) return null;
  return {
    userId: p.userId,
    nickname: p.nickname ?? '网易云音乐用户',
    avatarUrl: p.avatarUrl || '/images/播放.png',
  };
}

/** 每日推荐歌曲（需登录；明文通道，weapi 已被风控静默拒） */
export async function getDailyRecommendNetEase(musicU?: string | null): Promise<NetEaseSong[]> {
  const json = await apiGet<{ data?: { dailySongs?: RawSongV3[] } }>(
    '/api/v3/discovery/recommend/songs?limit=30',
    musicU
  );
  return (json?.data?.dailySongs ?? []).map(mapSongV3);
}

/** RawSearchSong（artists/album 旧结构）→ NetEaseSong */
function mapSearchSong(s: RawSearchSong): NetEaseSong {
  return {
    id: s.id,
    name: s.name ?? '',
    artists: (s.artists ?? []).map((a) => a.name).join(' / '),
    album: s.album?.name ?? '',
    cover: toHttps(
      s.album?.picUrl || s.album?.blurPicUrl || s.album?.artist?.img1v1Url || '/images/播放.png'
    ),
    duration: s.duration ?? 0,
    fee: s.fee ?? 0,
  };
}

/** 私人 FM（需登录；明文通道。data[i] 即歌曲对象，无 mainSong 包裹） */
export async function getPersonalFMNetEase(musicU?: string | null): Promise<NetEaseSong[]> {
  const json = await apiGet<{ data?: RawSearchSong[] }>(
    '/api/v1/radio/get?limit=3',
    musicU
  );
  // 明文通道一次返回 3 首独立歌曲——天然多曲队列
  // （weapi 时代的 mainSong 包裹结构已不存在）
  return (json?.data ?? []).map(mapSearchSong);
}

/** 用户自己的歌单（需登录） */
export async function getUserPlaylistsNetEase(
  uid: number,
  musicU?: string | null
): Promise<NetEasePlaylist[]> {
  const json = await weapiPost<{ playlist?: RawPlaylist[] }>(
    '/weapi/user/playlist',
    { uid, limit: 30, offset: 0, includeVideoTrack: true, csrf_token: '' },
    musicU
  );
  return (json?.playlist ?? []).map(mapPlaylist);
}

// ---------- 专辑 ----------

interface RawAlbum {
  id: number;
  name?: string;
  picUrl?: string;
  company?: { name?: string } | null;
  artist?: { name?: string };
  artists?: { name?: string }[];
  publishTime?: number;
  description?: string;
}

function mapAlbum(a: RawAlbum): NetEaseAlbum {
  const company = typeof a.company === 'string' ? a.company : a.company?.name;
  return {
    id: a.id,
    name: a.name ?? '未知专辑',
    cover: toHttps(a.picUrl || '/images/播放.png'),
    artist: a.artist?.name ?? ((a.artists ?? []).map((x) => x.name).filter(Boolean).join(' / ') || undefined),
    company: company || undefined,
    publishTime: a.publishTime,
    description: a.description,
  };
}

/** 当前账号收藏的专辑（需登录） */
export async function getAlbumSublistNetEase(
  musicU?: string | null,
  limit = 30,
  offset = 0
): Promise<{ albums: NetEaseAlbum[]; more: boolean }> {
  const json = await weapiPost<{ data?: { albums?: RawAlbum[]; hasMore?: boolean } }>(
    '/weapi/album/sublist',
    { limit, offset, total: true, csrf_token: '' },
    musicU
  );
  const albums = (json?.data?.albums ?? []).map(mapAlbum);
  return { albums, more: !!json?.data?.hasMore };
}

/** 专辑详情 + 全部曲目 */
export async function getAlbumNetEase(
  id: number,
  musicU?: string | null
): Promise<{ album: NetEaseAlbum; songs: NetEaseSong[] } | null> {
  const json = await weapiPost<{
    album?: RawAlbum & { songs?: RawSongV3[] };
    songs?: RawSongV3[];
  }>(`/weapi/v1/album/${id}`, { id, n: 1000, csrf_token: '' }, musicU);
  const raw = json?.album;
  if (!raw) return null;
  const songs = (raw.songs ?? json?.songs ?? []).map(mapSongV3);
  return { album: mapAlbum(raw), songs };
}

// ---------- 喜欢 ----------

/** 喜欢/取消喜欢歌曲（需登录，写入网易云「喜欢的音乐」歌单） */
export async function likeSongNetEase(
  trackId: number,
  like: boolean,
  musicU?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const json = await weapiPost<{ code?: number; songId?: number }>(
    '/weapi/song/like',
    { trackId, like, time: '3', csrf_token: '' },
    musicU
  );
  if (!json) return { ok: false, error: '网络异常或服务暂不可用' };
  // code 200 成功；502 表示已是该状态（重复喜欢/取消），视为幂等成功
  if (json.code === 200 || json.code === 502) return { ok: true };
  if (json.code === 301) return { ok: false, error: '登录已过期，请重新扫码登录' };
  return { ok: false, error: '操作失败（code ' + json.code + '）' };
}
