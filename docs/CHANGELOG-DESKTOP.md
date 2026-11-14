# 雅枫音乐 - 桌面客户端版本文档

> **架构说明（为什么 web 修复会同步进客户端）**
> 桌面客户端（`desktop/` + `src-tauri/`）与 Web 站共享**同一份 Next.js 产物**：
> `desktop/build.cmd` 每次构建都会执行 `npm run build`（DESKTOP_BUILD=1），把最新 web 代码
> 打进 `src-tauri/resources/next-server/`（Next standalone），由内嵌 node sidecar 运行。
> 因此：**web 侧的每个修复/优化，打新版本包后即自动应用到客户端**，无需重复开发。
> 客户端专属改动（Rust 壳/托盘/更新器）在本文档单独记录。

---

## [未发布] Web 侧 D 部分（稳定性）——将随下一版本发布

> 以下条目 **web 与客户端均存在**（共享代码库），修复后随版本同步。

| # | 问题 | 影响端 | 修复状态 |
|---|------|--------|----------|
| D1 | 断网检测与播放降级（navigator.onLine 监听、断网禁切歌、离线 UI 状态） | Web + 桌面 | 待开发 |
| D2 | iOS Safari 自动播放兼容（首次手势初始化 AudioContext） | Web（iOS）；桌面 WebView2 无此问题 | 待开发 |
| D3 | Cookie 登录指引优化（分步骤引导图） | Web + 桌面 | 待开发 |
| D4 | 音量条/进度条拖拽防抖 | Web + 桌面 | 待开发 |
| D5 | 音频损坏自动跳曲（5s 未缓冲跳过） | Web + 桌面 | 待开发 |
| D6 | 错误边界（React ErrorBoundary 包装主应用） | Web + 桌面 | ✅ 已有（app/error.tsx） |

---

## [v0.1.3] 2026-11-11

### 🔐 登录修复（重大）
- **扫码登录彻底修复**：切换到明文 `/api/` 通道 + `type:3` 匿名设备通道（与 YesPlayMusic 后端一致），
  并新增**匿名设备身份**机制（`lib/server/anonymousDevice.ts`：52 位 HEX deviceId + XOR-MD5 校验注册，
  缓存 MUSIC_A 设备令牌，全请求携带设备指纹 Cookie）——根治 8821「请切换其他登录方式」风控
- 此前两次失败修复记录：weapi 通道被网易静默拒绝（200 空 body）；api+type:1 仍缺设备身份

### ⚙️ 新增：设置页（/settings，导航栏齿轮进入）
- **播放**：默认音质（5 档）/ 默认倍速（0.5x–2.0x）
- **桌面端**（仅桌面显示）：**关闭按钮行为可选**（最小化到托盘 / 直接退出，持久化）+ 版本号显示
- **数据**：清除搜索历史 / 播放历史（带统计展示）
- **关于**：软件介绍、实时版本号、开源仓库、技术栈、合规声明

### 🖥️ 桌面体验
- **启动黑屏空窗修复**：窗口启动隐藏（主题底色打底），本地服务就绪且页面加载后才显示
- **更新机制全面重做（用户可控）**：发现新版 → 询问「立即更新/稍后/跳过此版本」（跳过持久化）→
  用户确认才下载 → 下载完询问「重启并安装/稍后」——不再强制下载/安装，每次会话最多打扰一次
- **关闭行为 bug**：Rust 端读设置从字符串匹配改为 serde_json 正规解析（美化 JSON 格式兼容）
- **Navbar 响应式**：窄窗口 emoji 隐藏只留文字、Logo 收缩，不再挤压

### 📝 其它
- 崩溃日志：panic hook 写 startup.log；run-debug.cmd 输出重定向到 run-debug-output.log（秒退可查）
- 4 处 QR 无效 href/9 处类型错误清理（tsc 0 错误）

---
## [v0.1.2] 2026-11-09（GitHub Releases）

### 客户端
- 自动更新体系上线（tauri-plugin-updater + GitHub Actions 发布流水线）
- NSIS 工具链预缓存（防 runner 瞬时 504）
- productName 改 YaFengMusic（修复签名文件名匹配）

### 已知问题（v0.1.2 遗留，本版本文档创建时确认）
- [x] 启动黑屏空窗期 → **已修复**（visible=false + loaded 信号后 show，见下版）
- [x] 更新弹窗强制下载、无法取消 → **已修复**（用户主动确认制，见下版）
- [x] 每次重启反复弹更新提示 → **已修复**（跳过版本持久化 + 会话内单次打扰）
- [x] 窄窗口 Navbar 挤压 → **已修复**（响应式断点优化，见下版）
- [x] 扫码登录被拒（weapi 通道被网易静默拒绝）→ **已修复**（切换 api 通道，与 YesPlayMusic 同款）

---

## [v0.1.1] 2026-11-08

- 数据持久化方案 B（Tauri Store 文件）落地
- ♥ 真实收藏网易云「喜欢的音乐」歌单（乐观更新 + 失败回滚）
- like 语义反转修复（Toast 文案与实际操作一致）
- QueueDrawer 让位标题栏、歌词浮窗底部锚定

## [v0.1.0] 2026-11-08

- 首个桌面客户端发布（Tauri 2 + Next standalone sidecar 架构）
- 无边框窗口 + 自定义标题栏 + 系统托盘 + 单实例锁
- 离线完整运行（23 个 API 路由本地化）


## G5.2 经验教训：A/B 归因实验与环境事故（2026-11-14）

### 单曲队列死循环 bug 归因（结论：历史漏洞，非 D 部分引入）
- 现象：私人 FM / 可视化页开播（队列仅 1 首）播完后不切歌、进度满格、播放按钮恒亮「播放中」。
- 根因链：FM 上游 /v1/radio/get 返回 mainSong+sideSongs，服务端只取 mainSong → 单曲队列 →
  ended → next() 算出 (0+1)%1=0 选中同一首 → GlobalAudioEngine 切歌 effect 依赖
  currentSong?.id，id 不变不重跑 → 卡死在结尾。随机模式「单曲队列除外」注释早有伏笔。
- 归因方法：git archive f613ba5（D 改动前）解压快照 + TEMP-DIAG 钩子 + 无头 Chrome CDP
  注入同一场景。旧代码同场景 paused=true/ct=5.00 卡死复现 → 与 D 无关。修复走 store
  restart 分支 + FM sideSongs 入列（9f1e2a8）。
- 教训：**「桌面端正常」不能作为回归依据**——桌面端跑的是旧安装包，不包含 web 最新改动；
  任何 web 回归验证必须在最新源码上做。多首队列掩盖单首队列的路径是长期盲区。

### 环境事故：junction 实验清空 node_modules（已恢复）
- 经过：为做 A/B 实验在 worktree 建 node_modules junction（mklink /J），worktree rm --force
  时跟随 junction 删除目标内容，主仓 node_modules 被清空。
- 恢复：npm ci（387 包）+ npm install --ignore-scripts 补 sharp/@img 平台二进制；tsc 通过。
- 附加发现：宿主剥离的环境变量缺 **ComSpec/PATHEXT** 时，npm 的 install 脚本
  （promise-spawn）直接 ERR_INVALID_ARG_TYPE——以后 npm 需显式注入 ComSpec。
- 铁律：**永久禁止对 node_modules 建任何 junction/symlink 再 rm**；实验目录一律用
  git archive 快照 + 绝对路径引用主仓依赖，或在独立 clone 中操作。
