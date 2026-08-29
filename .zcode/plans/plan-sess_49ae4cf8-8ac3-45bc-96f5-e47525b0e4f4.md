# 雅枫音乐 API 化全面重构计划

## 一、现状结论（探索结果）

**技术栈**：Next.js 15 App Router + React 19 + TS + Zustand(persist) + Tailwind 3 + framer-motion 12 + three/R3F/ogl + lenis。已有一套自建网易云服务端代理（`lib/server/netEase.ts` 手写 weapi AES+RSA 加密，经 Route Handler 同源代理，搜索/歌词/播放URL 已跑通），音频层为单例 `HTMLAudioElement` + Web Audio AnalyserNode + 全站唯一 rAF 帧调度 + 7 个可视化场景注册表，基础设施质量很高，重构在它之上进行。

**确认的 Bug/问题**（将全部修复）：
1. 在线歌歌词永远不渲染（`components/player/LyricsPanel.tsx:68` 条件 `!lyricUrl` 应为 `!lyricUrl && !neteaseId`）
2. 单曲循环失效（`GlobalAudioEngine.tsx:97` ended 一律调 next()，不判断 playMode）
3. 播放失败静默（VIP 歌 404 无提示、不跳下一首；无 audio `error` 监听、无失效重取）
4. 收藏的在线歌在喜欢页丢失（`app/likes/page.tsx` 查找池只有本地歌；likedIds 只存 id）
5. 请求无超时/错误与空结果不可区分（`lib/api.ts:11` 把 502 当空数组）
6. 随机播放可能重复当前曲；favicon 404；gsap 死依赖；`next.config.ts` 图片域名全放开

**空壳页面确认**：歌单/歌手/排行榜全部硬编码假数据（歌单点击播放是假的、热度值伪造、歌手 20 人仅 5-6 人有曲目）。

**已确认决策**（你已选择）：① 扩展现有网易云代理；② 接入网易云扫码登录；③ 全局常驻背景可视化+开关；④ 功能补充全选（队列面板/历史/音质+倍速/MediaSession+定时关闭）。

## 二、架构设计

分层不变，逐层扩展：`lib/server/netEase.ts`（唯一上游调用点）→ `app/api/*/route.ts`（同源代理，无 CORS 问题）→ `lib/api.ts`（客户端封装）→ `lib/store.ts`（Zustand）→ 页面。本地 `lib/data.ts` 降级为 API 失败兜底，UI 主流程不再展示本地区块。

### 服务端新增接口（全部网易云公开端点，无需登录的占大多数）
- 榜单：`/api/toplist`（官方榜列表）→ 榜单详情复用歌单详情
- 歌单：`/api/playlist-detail?id=`（元信息+trackIds → 批量 song/detail 取曲目）、`/api/playlist-hot?cat=&page=`、`/api/playlist-catalogue`、`/api/playlist-highquality`
- 歌手：`/api/artist?id=`（详情+热门50首）、`/api/artist-hot`
- 推荐（免登录）：`/api/personalized`（推荐歌单）、`/api/newsong`（推荐新歌）、`/api/search-hot`（热搜词）
- 登录态（需 MUSIC_U cookie 透传）：`/api/auth/qr-key` + `/api/auth/qr-check`（扫码轮询，803 时从 Set-Cookie 提取 MUSIC_U）、`/api/account`（用户信息）、`/api/recommend-songs`（每日推荐）、`/api/personal-fm`（私人FM）、`/api/user-playlists`
- 既有接口增强：`/api/search` 加 type（单曲/歌手/歌单）、`/api/song-url` 加 level 音质参数（standard/higher/lossless）、批量取 URL
- 基建：统一上游 fetch 超时 + 重试一次；MUSIC_U 从请求头 `x-ncm-music-u` 透传（客户端 localStorage 保存，服务端无状态）

### 客户端封装（`lib/api.ts`）
- 统一 `apiFetch<T>()`：`AbortSignal.timeout(10s)` + 错误类型区分（网络错误 vs 空结果）+ MUSIC_U 头注入
- 每个服务端接口一个类型化函数 + 统一 `toTrack()` 映射
- 启用现有 `prefetchTrack()`：播放某曲后预取队列下一首的播放地址

## 三、页面重构（全部 API 化）

| 页面 | 改造 |
|---|---|
| `/` 首页 | Hero（搜索框+每日推荐/私人FM入口）+ 推荐歌单横滑 + 推荐新歌网格 + 官方榜单入口卡 + 焦点歌手；全部真实 API 数据，带 loading/错误态与本地兜底 |
| `/songlist` | 分类 tab（catalogue API）+ 热门/精品歌单网格，分类筛选+分页 |
| `/songlist/[id]` 新增 | 歌单详情：封面头图+播放量+描述，曲目列表（分批加载），点播整列入队 |
| `/singer` | 热门歌手网格（artist-top API）+ 歌手搜索 |
| `/singer/[id]` 新增 | 歌手详情：头图/简介/热门50首可直接播放 |
| `/musictop` | 真实官方榜单（飙升/新歌/热歌/原创…），左榜右曲，真实热度值，整列入队 |
| `/search` | 错误区分（网络故障≠无结果）+ 单曲/歌手/歌单三 tab + 热搜词 + 搜索历史 chips |
| `/likes` | 存完整 Track 快照修复在线歌丢失；空态引导 |
| `/login` | 重写为网易云扫码登录（qrcode.react 渲染 + 3s 轮询 + 800过期/802已扫/803成功态），Navbar 显示头像昵称；删除本地假账号 |
| `/visualizer` | 沉浸模式：全屏场景 + 中央迷你圆环 + 全屏滚动歌词 + 底部场景胶囊 dock（3s 自动隐藏已有） |

Navbar 增加登录头像/私人FM入口；移动端适配补 safe-area。

## 四、播放器与可视化（核心视觉升级）

**可隐藏播放条（`components/ui/PlayerBar.tsx` 重构）**：
- 美化：毛玻璃+渐变发光进度条（拖拽把手）、音质标签、队列/歌词/可视化入口按钮，framer-motion spring 微动效
- 可隐藏：右下角收起按钮 → 整条滑出屏幕，留一个 mini 悬浮播放器（封面旋转+播放/暂停+展开），点击恢复；状态 `barHidden` 持久化
- 新增移动端布局 + `env(safe-area-inset-bottom)`

**全局背景可视化（新增 `components/visualizer/GlobalVisualizerBackground.tsx` 挂根布局）**：
- 播放时全屏场景渲染在 `fixed inset-0 z-0`（现有 SceneManager fullscreen 层复用，从 /visualizer 页提升到全局），所有页面可见；内容层加半透明渐变遮罩保证可读性
- 新增 1 个 **light 档全屏场景**（Canvas 2D 流光频谱背景，非 WebGL）作为默认，保证低配设备也可用；WebGL 场景（粒子宇宙/星尘/丝弦/星际穿越）为 high/medium 档选项，沿用 SceneManager 互斥与 useQualityTier 降级
- 全局开关：Navbar 设置浮层内 + 场景切换，`globalVizEnabled` 持久化；暂停时帧调度器自动降频已有
- 封面取色：canvas 采样封面主色 → 写入 themeEngine CSS 变量 + 封面模糊背景层，页面氛围跟随歌曲
- 歌词面板修复 bug 并升级为全屏滚动歌词（当前行放大发光/按行滚动/点击行 seek），PlayerBar「歌词」按钮弹出

## 五、功能补充（你选的 4 组）

1. **播放队列面板**：右侧抽屉（AnimatePresence 滑入），当前队列列表、当前曲高亮、点击切歌/移除/清空；PlayerBar 队列按钮+数量徽标
2. **播放历史+搜索历史**：store `history: Track[]`（去重上限 100，persist），新增 `/history` 页+Navbar 入口；搜索历史 localStorage 上限 10
3. **音质选择+倍速**：`quality`（标准/HQ/无损，VIP 歌失败自动降级并 toast 提示）+ `playbackRate`（0.5~2x），PlayerBar 菜单
4. **系统媒体控制+定时关闭**：MediaSession API（媒体键/锁屏封面/进度同步）+ 定时关闭（15/30/60/90 分钟，到点音量淡出暂停，倒计时徽标）

## 六、状态模型变更（`lib/store.ts`）

- `likedIds: number[]` → `likedTracks: Track[]`（persist migrate 迁移旧数据）；`playlist` 初始 `[]` 不再是本地歌
- 新增：`barHidden`、`globalVizEnabled`、`quality`、`playbackRate`、`history`、`sleepTimerAt`
- `next()` 修复：single 模式由 GlobalAudioEngine ended 分支重播；random 排除当前曲
- Track 模型不变（neteaseId 判别在线/本地），`lib/data.ts` 保留作兜底

## 七、实施顺序（6 个阶段，每阶段独立可验证）

1. **修复+健壮性**：歌词 bug、单曲循环、audio error 监听（失效重取→自动跳曲+toast）、请求超时、错误区分、随机去重、favicon metadata、移除 gsap 死依赖、图片域名收紧为 `**.music.126.net`
2. **API 层**：netEase.ts 新增全部上游函数 + 新 Route Handlers + api.ts 客户端封装与超时基建
3. **页面重构**：按上表逐页 API 化 + 两个新详情页 + 本地数据降级兜底
4. **扫码登录**：QR 轮询 + MUSIC_U 透传 + 每日推荐/私人FM/用户歌单 + Navbar 用户区
5. **播放器+可视化**：PlayerBar 重构（可隐藏+mini）、队列面板、全局背景可视化+light 场景+开关、封面取色、歌词升级、/visualizer 沉浸页
6. **功能收尾**：历史页、搜索历史、音质/倍速、MediaSession、定时关闭

## 八、验证与风险

- 每阶段：`npm run lint` + `npx tsc --noEmit` + `npm run build` 通过；关键链路（搜索→播放→歌词→可视化→队列）浏览器实测
- 风险：VIP 歌无法播放（非 VIP 登录也一样）→ 自动跳曲+明确提示；网易云接口对海外 IP 有限制（README 已知，本地开发不受影响）；扫码登录 cookie 存 localStorage（个人学习项目可接受，文档注明）；不新增重型依赖（仅 `qrcode.react`），framer-motion 已满足全部动效需求
- 不做（保持范围收敛）：MV/评论/下载/桌面歌词/EQ/i18n/PWA/真实云端歌单同步