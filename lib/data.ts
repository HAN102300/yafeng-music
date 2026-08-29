// 统一音轨类型（本地 / 在线共用，在线歌以 neteaseId 判别）
// 全站内容已接入网易云在线曲库；本地素材仅保留为离线兜底，
// 不再出现在任何页面的主展示流程中。
export interface Track {
  id: number;
  title: string;
  artist: string;
  cover: string;
  audio: string;
  /** LRC 歌词文件地址（public/lyrics/*.lrc） */
  lyricUrl?: string;
  /** 网易云在线歌曲 id（有值即在线歌，audio 为空，由引擎动态解析播放源） */
  neteaseId?: number;
  /** 时长（毫秒） */
  duration?: number;
  /** 版权标记：>0 为 VIP / 仅试听 */
  fee?: number;
}

// 兼容别名：旧代码中的 Song 即 Track
export type Song = Track;

/** 本地曲库（public/media 离线兜底，当前 UI 主流程不展示） */
export const localSongs: Track[] = [
  {
    id: 1,
    title: '泡沫',
    artist: '邓紫棋',
    cover: '/images/泡沫.png',
    audio: '/media/泡沫.mp3',
    lyricUrl: '/lyrics/1.lrc',
  },
  {
    id: 2,
    title: '小城夏天',
    artist: '苏星婕',
    cover: '/images/小城夏天.png',
    audio: '/media/小城夏天.mp3',
    lyricUrl: '/lyrics/2.lrc',
  },
  {
    id: 3,
    title: 'Bezos',
    artist: 'Maroon5',
    cover: '/images/Bezos.png',
    audio: '/media/bezos.mp3',
    lyricUrl: '/lyrics/3.lrc',
  },
  {
    id: 4,
    title: 'cool kids',
    artist: '告五人',
    cover: '/images/cool kids.png',
    audio: '/media/cool kids.mp3',
    lyricUrl: '/lyrics/4.lrc',
  },
  {
    id: 5,
    title: 'I Really Want to Stay At Your House',
    artist: 'Rosa Walton、Hallie Coggins',
    cover: '/images/赛博朋克.png',
    audio: '/media/I Really Want to Stay At Your House-Rosa Walton、Hallie Coggins.mp3',
    lyricUrl: '/lyrics/5.lrc',
  },
  {
    id: 6,
    title: 'infinity',
    artist: '飞儿乐队',
    cover: '/images/infinity.png',
    audio: '/media/infinity.mp3',
    lyricUrl: '/lyrics/6.lrc',
  },
  {
    id: 7,
    title: 'PYRO',
    artist: 'Chester Young、Castion',
    cover: '/images/Pyro.png',
    audio: '/media/PYRO-Chester Young、Castion.mp3',
    lyricUrl: '/lyrics/7.lrc',
  },
  {
    id: 8,
    title: 'Thunder',
    artist: 'Imagine Dragons、Khalid',
    cover: '/images/Thunder.png',
    audio: '/media/Thunder _ Young Dumb & Broke (Medley)-Imagine Dragons、Khalid.mp3',
    lyricUrl: '/lyrics/8.lrc',
  },
];
