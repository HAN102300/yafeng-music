# 雅枫音乐 🦐

沉浸式可视化音乐播放器，让音乐看得见。基于 Next.js App Router 构建，支持在线曲库搜索、音频实时可视化、歌词同步与丝滑动效。

## 功能特性

- **在线音乐**：接入网易云公开接口，支持歌曲搜索、真实播放地址解析、LRC 歌词同步
- **音频可视化**：环形频谱 / 柱状频谱 / 波形律动 / 3D 粒子 / 星尘 / 丝弦 / 星际穿越 七种场景，随节拍实时响应
- **自适应主题**：根据音频低频/中频/高频能量动态计算全站配色
- **播放器**：拖拽进度/音量、列表循环/单曲循环/随机播放、喜欢收藏
- **本地账号**：注册 / 登录 / 登出（localStorage），支持我的喜欢列表
- **体验优化**：Lenis 丝滑滚动、`next/image` 图片优化、设备质量分档降级、节拍检测环形缓冲

## 技术栈

Next.js 15 · React 19 · TypeScript · Zustand · Tailwind CSS · framer-motion · three.js / @react-three/fiber · ogl · Lenis

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
  api/                # 服务端代理（search / song-url / lyric）
  visualizer/         # 可视化播放器页
  search/             # 在线搜索页
  likes/              # 我的喜欢页
  ...
components/
  player/             # 全局音频引擎、歌词面板
  ui/                 # Navbar、PlayerBar、reactbits/aceternity 组件
  visualizer/         # 可视化场景（canvas / R3F / ogl）
hooks/                # useAudioFrame / useAudioProgress / useDragPercent / useQualityTier
lib/
  audio/              # 音频引擎单例 + 帧调度器
  server/netEase.ts   # 网易云 weapi 加密代理
  data.ts             # 本地歌曲 / 歌手 / 歌单 / 排行榜数据
  store.ts            # Zustand 全局状态
```

## 架构要点

- **单例音源**：`lib/audio/engine.ts` 持有唯一 `HTMLAudioElement` + `AudioContext`，全站共享
- **订阅制帧调度**：`subscribeFrame` 全站唯一 rAF 循环，消费者直接读共享 `FrameData`，0 React 重渲染
- **在线音源解析**：`lib/onlineSource.ts` 解析播放地址并缓存（约 20 分钟过期自动刷新）
- **服务端代理**：网易云 `weapi` 加密在服务端完成，规避跨域与加密细节暴露

## API 路由

| 路由 | 参数 | 说明 |
|---|---|---|
| `GET /api/search` | `q`, `limit` | 搜索歌曲 |
| `GET /api/song-url` | `id` | 解析播放地址 |
| `GET /api/lyric` | `id` | 获取 LRC 歌词 |

## 已知限制

1. **VIP 歌曲**：网易云 VIP 曲目不返回播放地址（返回 404），此类歌曲无法播放，属版权限制
2. **播放地址过期**：在线歌曲播放地址约 20 分钟过期，已做缓存 + 自动刷新
3. **部署地域**：网易云部分接口对非中国大陆服务器 IP 有访问限制，部署时需注意服务器位置
4. **在线音源可用性**：搜索/播放依赖网易云公开接口，接口变更可能影响功能；本地 `public/media` 素材始终可作为兜底

## 免责声明

本项目仅供学习交流。在线音乐数据与播放地址均来自网易云音乐公开接口，版权归原作者所有，请勿用于商业用途。
