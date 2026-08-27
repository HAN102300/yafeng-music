// 歌曲数据 - 匹配实际媒体文件和图片
// 统一音轨类型（合并自旧版 Song / MusicTrack）
export interface Track {
  id: number;
  title: string;
  artist: string;
  cover: string;
  audio: string;
  /** LRC 歌词文件地址（public/lyrics/*.lrc） */
  lyricUrl?: string;
}

// 兼容别名：旧代码中的 Song 即 Track
export type Song = Track;

export interface Artist {
  id: number;
  name: string;
  avatar: string;
  genre: string;
}

export interface Playlist {
  id: number;
  name: string;
  cover: string;
  count: number;
}

export interface RankSong extends Track {
  duration: string;
  rank: number;
}

// 首页推荐歌曲 - 对应实际媒体文件
export const songs: Track[] = [
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

// 歌手数据 - 使用原始歌手图片
export const artists: Artist[] = [
  { id: 1, name: '周杰伦', avatar: '/images/周杰伦.webp', genre: '流行' },
  { id: 2, name: '陈奕迅', avatar: '/images/陈奕迅.webp', genre: '流行' },
  { id: 3, name: '邓紫棋', avatar: '/images/邓紫棋.webp', genre: '流行' },
  { id: 4, name: '林俊杰', avatar: '/images/林俊杰.webp', genre: '流行' },
  { id: 5, name: '薛之谦', avatar: '/images/薛之谦.webp', genre: '流行' },
  { id: 6, name: '李荣浩', avatar: '/images/李荣浩.webp', genre: '流行' },
  { id: 7, name: '周深', avatar: '/images/周深.webp', genre: '流行' },
  { id: 8, name: '许嵩', avatar: '/images/许嵩.webp', genre: '流行' },
  { id: 9, name: '五月天', avatar: '/images/五月天.webp', genre: '摇滚' },
  { id: 10, name: '飞儿乐队', avatar: '/images/飞儿乐队.webp', genre: '摇滚' },
  { id: 11, name: '告五人', avatar: '/images/告五人.webp', genre: '独立' },
  { id: 12, name: '逃跑计划', avatar: '/images/逃跑计划.webp', genre: '摇滚' },
  { id: 13, name: '李玉刚', avatar: '/images/李玉刚.webp', genre: '国风' },
  { id: 14, name: '等什么君', avatar: '/images/等什么君.webp', genre: '国风' },
  { id: 15, name: '蒋雪儿', avatar: '/images/蒋雪儿.webp', genre: '流行' },
  { id: 16, name: '苏星婕', avatar: '/images/苏星婕.webp', genre: '流行' },
  { id: 17, name: '音阙诗听', avatar: '/images/音阙诗听.webp', genre: '国风' },
  { id: 18, name: '艾辰', avatar: '/images/艾辰.webp', genre: '流行' },
  { id: 19, name: 'Imagine Dragons', avatar: '/images/Imagine Dragons.webp', genre: '摇滚' },
  { id: 20, name: 'Maroon5', avatar: '/images/Maroon5.webp', genre: '流行' },
];

// 歌单数据 - 使用原始歌单分类图片
export const playlists: Playlist[] = [
  { id: 1, name: '古风戏曲', cover: '/images/1古风戏曲.png', count: 50 },
  { id: 2, name: '国外热曲', cover: '/images/2国外热曲.png', count: 80 },
  { id: 3, name: '温柔故乡', cover: '/images/3温柔故乡.png', count: 45 },
  { id: 4, name: '战斗燃起来了', cover: '/images/4战斗燃起来了.png', count: 60 },
  { id: 5, name: '全名翻唱', cover: '/images/5全名翻唱.png', count: 70 },
  { id: 6, name: '海岸边', cover: '/images/6海岸边.png', count: 35 },
  { id: 7, name: '经典老歌', cover: '/images/7经典老歌.png', count: 90 },
  { id: 8, name: '上路DJ', cover: '/images/8上路DJ.png', count: 55 },
  { id: 9, name: '温暖情歌', cover: '/images/9温暖情歌.png', count: 40 },
  { id: 10, name: '伤感歌曲', cover: '/images/10桑.png', count: 65 },
  { id: 11, name: '海外热曲', cover: '/images/11海外热曲.png', count: 75 },
  { id: 12, name: '治愈歌曲', cover: '/images/12治愈歌曲.png', count: 50 },
];

// 排行榜数据
// 注意：id 9-13 为演示条目，复用已有音频文件，不在默认播放列表 songs 中；
// 播放时应通过 playQueueFrom(rankSongs, index) 整列入队，避免 next() 查找不到当前歌曲
export const rankSongs: RankSong[] = [
  { id: 1, title: '泡沫', artist: '邓紫棋', cover: '/images/泡沫.png', audio: '/media/泡沫.mp3', duration: '4:18', rank: 1 },
  { id: 2, title: '小城夏天', artist: '苏星婕', cover: '/images/小城夏天.png', audio: '/media/小城夏天.mp3', duration: '3:45', rank: 2 },
  { id: 3, title: 'Bezos', artist: 'Maroon5', cover: '/images/Bezos.png', audio: '/media/bezos.mp3', duration: '3:30', rank: 3 },
  { id: 4, title: 'cool kids', artist: '告五人', cover: '/images/cool kids.png', audio: '/media/cool kids.mp3', duration: '3:55', rank: 4 },
  { id: 5, title: 'infinity', artist: '飞儿乐队', cover: '/images/infinity.png', audio: '/media/infinity.mp3', duration: '4:02', rank: 5 },
  { id: 6, title: 'PYRO', artist: 'Chester Young、Castion', cover: '/images/Pyro.png', audio: '/media/PYRO-Chester Young、Castion.mp3', duration: '3:20', rank: 6 },
  { id: 7, title: 'Thunder', artist: 'Imagine Dragons、Khalid', cover: '/images/Thunder.png', audio: '/media/Thunder _ Young Dumb & Broke (Medley)-Imagine Dragons、Khalid.mp3', duration: '3:40', rank: 7 },
  { id: 8, title: 'I Really Want to Stay At Your House', artist: 'Rosa Walton、Hallie Coggins', cover: '/images/赛博朋克.png', audio: '/media/I Really Want to Stay At Your House-Rosa Walton、Hallie Coggins.mp3', duration: '3:15', rank: 8 },
  { id: 9, title: '光年之外', artist: '邓紫棋', cover: '/images/邓紫棋.jpg', audio: '/media/泡沫.mp3', duration: '4:10', rank: 9 },
  { id: 10, title: '告白气球', artist: '周杰伦', cover: '/images/周杰伦.webp', audio: '/media/infinity.mp3', duration: '3:35', rank: 10 },
  { id: 11, title: '演员', artist: '薛之谦', cover: '/images/薛之谦.webp', audio: '/media/cool kids.mp3', duration: '4:20', rank: 11 },
  { id: 12, title: '起风了', artist: '买辣椒也用券', cover: '/images/林俊杰.jpg', audio: '/media/小城夏天.mp3', duration: '3:50', rank: 12 },
  { id: 13, title: '孤勇者', artist: '陈奕迅', cover: '/images/陈奕迅.webp', audio: '/media/bezos.mp3', duration: '4:05', rank: 13 },
];
