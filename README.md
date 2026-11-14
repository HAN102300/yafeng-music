# 雅枫音乐 🦐

沉浸式可视化在线音乐播放器，让音乐看得见。基于 Next.js App Router 构建，全站内容接入网易云在线曲库：榜单 / 歌单 / 歌手 / 每日推荐 / 私人 FM 全部真实数据，支持扫码登录、全局背景音乐可视化与丝滑动效。

## 📥 下载桌面客户端

**[⬇️ 下载最新版 v0.1.4 安装包](https://github.com/HAN102300/yafeng-music/releases/latest)**（YaFengMusic_0.1.4_x64-setup.exe，约 37 MB，含完整离线能力）

> ⚠️ 历史版本警示：v0.1.2 存在严重缺陷（扫码登录不可用 / 更新强制下载），请勿下载；v0.1.0–v0.1.3 用户建议直接升级 v0.1.4。

已安装旧版本：启动约 12 秒后会自动提示更新，点击「立即更新」一键升级；或在 **设置 → 关于 → 检查更新** 手动检查。

各版本完整变更记录：[docs/CHANGELOG-DESKTOP.md](docs/CHANGELOG-DESKTOP.md) · 逐版本发布说明：[docs/releases/](docs/releases/)

---

## 功能特性

- **在线曲库全站化**：首页推荐歌单/新歌速递/官方榜单、歌单广场（分类+精品）、歌手墙+歌手主页、真实排行榜、多类型搜索（单曲/歌手/歌单）+ 热搜词 + 搜索历史
- **网易云扫码登录**：解锁每日推荐、私人 FM、我的歌单；登录态（MUSIC_U）仅存本地浏览器
- **全局背景可视化**：所有页面共享音乐驱动的全屏可视化背景（封面取色氛围 + 流光频谱/粒子宇宙/星尘/丝弦/星际穿越），低配设备自动降级
- **播放器**：可隐藏播放条（收起后右下角 mini 悬浮播放器）、播放队列抽屉、全屏滚动歌词（点击行 seek）、音质选择（标准/较高/极高/无损）、倍速播放（0.5x~2x）、定时关闭（淡出停止）、系统媒体键/锁屏控制（Media Session）
- **音频可视化**：流光频谱 / 环形音浪 / 频谱分析 / 粒子宇宙 / 星尘漂浮 / 丝弦波动 / 星际穿越 七种场景，随节拍实时响应
- **自适应主题**：音频能量驱动全站配色 + 封面主色提取氛围
- **播放健壮性**：播放地址缓存预刷新、队列预取、播放失败自动重取/跳曲并提示、请求统一超时、网络故障与空结果区分
- **最近在听 / 我的喜欢**：本地持久化，在线歌完整快照收藏

## 技术栈

Next.js 15 · React 19 · TypeScript · Zustand · Tailwind CSS · framer-motion · three.js / @react-three/fiber · ogl · Lenis · qrcode.react

## 快速开始

```bash
npm install
npm run dev        # 开发模式 http://localhost:3000
```

生产构建：

```bash
npm run build
npm start
```

代码检查与类型检查：

```bash
npm run lint
npx tsc --noEmit
```

## 项目结构

```
app/                  # App Router 页面与 API 路由
  api/                # 服务端代理（search / song-url / lyric / toplist / playlist /
                      #   artist / personalized / newsong / search-hot / auth / account /
                      #   recommend-songs / personal-fm / user-playlists ...）
  page.tsx            # 首页（推荐歌单/新歌/榜单/歌手 + 每日推荐/私人FM）
  songlist/[id]/      # 歌单广场 / 歌单详情
  singer/[id]/        # 歌手墙 / 歌手详情
  musictop/           # 官方排行榜
  search/ history/ likes/ login/ visualizer/
components/
  player/             # 全局音频引擎、歌词浮层/沉浸页滚动歌词、队列抽屉、设置菜单
  ui/                 # Navbar、PlayerBar、Toast、reactbits/aceternity 组件
  cards/              # 歌单/歌手卡片
  visualizer/         # 可视化场景 + 全局背景层（GlobalVisualizerBackground）
hooks/                # useAudioFrame / useAudioProgress / useDragPercent / useQualityTier / useLyrics
lib/
  audio/              # 音频引擎单例 + 帧调度器
  server/netEase.ts   # 网易云公开接口 + weapi 加密代理（唯一上游调用点）
  server/auth.ts      # Route Handler 工具（MUSIC_U 透传）
  api.ts              # 前端 API 客户端（统一超时/错误类型/登录态）
  ncmAuth.ts          # 扫码登录态管理
  coverColor.ts       # 封面主色提取
  onlineSource.ts     # 播放地址缓存/预取/失效
  store.ts            # Zustand 全局状态（含持久化迁移）
  data.ts             # Track 统一音轨类型（本地曲库已下线，全部为网易云在线歌）
```

## 架构要点

- **单例音源**：`lib/audio/engine.ts` 持有唯一 `HTMLAudioElement` + `AudioContext`，全站共享
- **订阅制帧调度**：`subscribeFrame` 全站唯一 rAF 循环，消费者直接读共享 `FrameData`，0 React 重渲染；暂停自动降频，页面隐藏停摆
- **全局背景可视化**：`GlobalVisualizerBackground` 挂根布局，封面模糊取色氛围 + 全屏场景 + 可读性遮罩三层；`SceneManager` 保证同屏最多 1 个 WebGL context
- **在线音源解析**：`lib/onlineSource.ts` 解析播放地址并缓存（约 20 分钟过期自动刷新），支持按音质档位解析与队列预取
- **服务端代理**：网易云明文接口与 `weapi` 加密全部收敛在服务端，浏览器仅同源调用 `/api/*`；登录态经 `x-ncm-music-u` 头透传，服务端无状态

## API 路由（服务端代理）

| 路由 | 参数 | 说明 |
|---|---|---|
| `GET /api/search` | `q`, `type`, `limit` | 搜索（song/artist/playlist） |
| `GET /api/search-hot` | — | 热搜词 |
| `GET /api/song-url` | `id`, `level` | 解析播放地址（standard~hires） |
| `GET /api/lyric` | `id` | 获取 LRC 歌词 |
| `GET /api/toplist` | — | 全部官方榜单 |
| `GET /api/playlist` | `id`, `limit`, `offset` | 歌单/榜单详情+分页曲目 |
| `GET /api/playlist-hot` | `cat`, `offset`, `high` | 热门/精品歌单 |
| `GET /api/playlist-catalogue` | — | 歌单分类目录 |
| `GET /api/artist` | `id` | 歌手详情+热门歌曲 |
| `GET /api/artist-hot` | `limit`, `offset` | 热门歌手 |
| `GET /api/personalized` | `limit` | 个性化推荐歌单 |
| `GET /api/newsong` | `limit` | 推荐新歌 |
| `GET /api/auth/qr-key` / `qr-check` | `key` | 扫码登录 |
| `GET /api/account` | 登录态 | 当前账号信息 |
| `GET /api/recommend-songs` | 登录态 | 每日推荐 |
| `GET /api/personal-fm` | 登录态 | 私人 FM |
| `GET /api/user-playlists` | `uid`, 登录态 | 我的歌单 |

## 已知限制

1. **VIP 歌曲**：网易云 VIP 曲目不返回播放地址（非 VIP 账号即使登录也一样），此类歌曲自动跳下一首并提示，属版权限制
2. **播放地址过期**：在线歌曲播放地址约 20 分钟过期，已做缓存预刷新 + 播放中失效自动重取
3. **部署地域**：网易云部分接口对非中国大陆服务器 IP 有访问限制，部署时需注意服务器位置
4. **无损音质**：lossless/hires 需黑胶 VIP 账号，普通账号自动回落标准音质
5. **登录态安全**：MUSIC_U 存于 localStorage（个人学习项目可接受的安全边界），本站不存储任何账号数据

## 免责声明

本项目仅供学习交流。在线音乐数据与播放地址均来自网易云音乐公开接口，版权归原作者所有，请勿用于商业用途。
