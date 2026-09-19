// 统一音轨类型（本地 / 在线共用，在线歌以 neteaseId 判别）
// 全站内容已接入网易云在线曲库；本地素材仅保留为离线兜底，
// 不再出现在任何页面的主展示流程中。
export interface Track {
  id: number;
  title: string;
  artist: string;
  cover: string;
  audio: string;
  /** 网易云在线歌曲 id（有值即在线歌，audio 为空，由引擎动态解析播放源） */
  neteaseId?: number;
  /** 时长（毫秒） */
  duration?: number;
  /** 版权标记：>0 为 VIP / 仅试听 */
  fee?: number;
}
