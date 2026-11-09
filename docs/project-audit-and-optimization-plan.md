# 🎵 雅枫音乐 - 项目深度审查与优化规划

**审查日期**: 2026-11-07  
**项目类型**: 沉浸式可视化在线音乐播放器 (Next.js 15 + React 19)  
**核心特色**: WebGL 音频可视化 + 网易云 API 聚合

---

## 📊 一、整体评价

### ✅ **优势亮点**
1. **技术栈现代且精简** - Next.js 15, React 19, TypeScript, Zustand, framer-motion
2. **架构设计合理** - 单例音频引擎 + 全局状态管理 + 服务端代理 API
3. **可视化系统出色** - 7 种场景的 WebGL 音频驱动效果
4. **用户体验细腻** - 氛围色跟随封面、流畅动画、Toast 提示
5. **播放功能完整** - 音质切换、倍速、定时关闭、播放队列、Media Session

### ⚠️ **主要问题**
1. **UI/UX 细节待完善** - 部分交互反馈不足、空状态设计缺失
2. **移动端适配薄弱** - 缺少专门的移动端优化
3. **功能覆盖有限** - 收藏管理、历史记录、歌词编辑等功能缺失
4. **性能隐患** - 部分组件存在过度渲染风险
5. **错误处理不完善** - 网络异常、加载失败的降级体验较差

---

## 🔍 二、详细审查清单

### 🎨 **A. UI/UX 优化方向**
> **✅ 2026-11-08 复核**：A1 令牌体系 / A2 交互反馈·骨架屏（已接入 songlist+search）·空态·错误页（error.tsx/not-found.tsx 已补建）/ A3 移动端·safe-area 主体完成。**遗留**：触控目标 44×44px 全面排查（低优先）。

#### **A1. 基础视觉统一性**
| 问题 | 优先级 | 文件位置 | 建议方案 |
|------|--------|----------|----------|
| **颜色系统不一致** | 🔴 高 | `lib/themes.ts` | 建立统一的 CSS 变量规范，确保所有主题使用相同的基础色调 |
| **字体大小跳跃** | 🟡 中 | `app/page.tsx`, `components/ui/*.tsx` | 定义标准化的字号层级 (xs/sm/base/lg/xl) |
| **间距不统一** | 🟡 中 | 全项目 | 使用 Tailwind spacing scale，避免手写数值 |
| **阴影层次混乱** | 🟢 低 | 各组件 | 建立 3 级阴影体系：shadow-sm/md/lg |

#### **A2. 交互体验提升**
| 问题 | 优先级 | 文件位置 | 建议方案 |
|------|--------|----------|----------|
| **按钮无点击态** | 🟡 中 | `components/ui/Navbar.tsx` | 添加 `whileTap={{ scale: 0.95 }}` micro-interaction |
| **Hover 效果缺失** | 🟢 低 | `components/cards/*.tsx` | 卡片添加 hover:scale 和 hover:border 反馈 |
| **加载骨架屏不足** | 🔴 高 | `components/ui/StateViews.tsx` | 为歌单/歌手卡片设计专门的 Skeleton 组件 |
| **空状态设计** | 🟡 中 | `app/search/page.tsx` | "暂无搜索历史" → 引导用户搜索或查看热门内容 |
| **错误页面简陋** | 🟡 中 | `ErrorBlock` | 提供重试按钮 + 返回首页入口 |

#### **A3. 响应式与移动端**
| 问题 | 优先级 | 文件位置 | 建议方案 |
|------|--------|----------|----------|
| **移动端布局崩溃** | 🔴 高 | `components/ui/PlayerBar.tsx` | 小屏幕隐藏非核心按钮 (音量显示为图标) |
| **触控区域偏小** | 🟡 中 | 全项目 | 最小触控目标 44×44px |
| **Safe Area 未适配** | 🟡 中 | `app/layout.tsx` | iPhone 刘海屏底部安全距离 |
| **触摸手势支持** | 🟢 低 | `visualizer/` | 移动端添加双指缩放、滑动切歌手势 |

---

### ⚡ **B. 性能优化方向**

#### **B1. 渲染性能**
| 问题 | 优先级 | 文件位置 | 建议方案 |
|------|--------|----------|----------|
| **高频更新触发重渲染** | 🟡 中 | `GlobalAudioEngine.tsx` | 将节拍检测逻辑从 `useEffect` 分离到独立订阅 |
| **Visualizer 占用过高** | 🟡 中 | `components/visualizer/SceneManager.tsx` | 添加 GPU 性能监控，低配设备自动降级 |
| **图片懒加载缺失** | 🟢 低 | `components/cards/*.tsx` | 专辑封面使用 Next.js Image 的 `priority={false}` |
| **列表滚动性能** | 🟡 中 | `components/ui/TrackList.tsx` | 长列表实现虚拟滚动 (只渲染可视区) |

#### **B2. 资源加载**
| 问题 | 优先级 | 文件位置 | 建议方案 |
|------|--------|----------|----------|
| **WebGL 初始化慢** | 🟡 中 | `visualizer/` | 预加载 Shader 资源，分步构建场景 |
| **API 请求未缓存** | 🟢 低 | `lib/api.ts` | 同类型请求加入 5 分钟缓存 (SWR 模式) |
| **Theme 切换闪烁** | 🟢 低 | `app/layout.tsx` | SSR 阶段禁用动态主题，hydration 后启用 |

#### **B3. 内存管理**
| 问题 | 优先级 | 文件位置 | 建议方案 |
|------|--------|----------|----------|
| **事件监听泄漏风险** | 🟡 中 | `GlobalAudioEngine.tsx` | 检查所有 `addEventListener` 是否都有对应的 `removeEventListener` |
| **localStorage 膨胀** | 🟢 低 | `lib/store.ts` | 收藏记录限制 500 条，旧数据定期清理 |
| **音源 URL 缓存溢出** | 🟡 中 | `lib/onlineSource.ts` | LRU 策略限制缓存数量 (如 20 首) |

---

### 🔧 **C. 功能扩展方向**

#### **C1. 已存在但可深化的功能**
| 功能 | 现状 | 扩展建议 | 优先级 |
|------|------|----------|--------|
| **播放队列** | 基础列表 | ▶ 支持拖拽排序<br>▶ 批量删除<br>▶ 导入外部歌单 | 🟠 中高 |
| **收藏系统** | 本地存储 | ▶ 云端同步 (登录用户)<br>▶ 收藏夹分类 (喜欢/珍藏/日常)<br>▶ 一键导出为歌单 | 🔴 高 |
| **历史记录** | 最近听 100 首 | ▶ 按日期分组展示<br>▶ 快捷「重温」入口<br>▶ 统计年度报告 | 🟡 中 |
| **定时关闭** | 固定时长 | ▶ 倒计时自定义<br>▶ 渐弱时长选择 (30s/60s/120s)<br>▶ 睡眠白噪音模式 | 🟢 低 |
| **音质选择** | 标准/较高/极高/无损 | ▶ VIP 标识提醒<br>▶ 流量模式自动降质<br>▶ Wi-Fi 下推荐高音质 | 🟡 中 |

#### **C2. 缺失的核心功能**
| 功能 | 描述 | 技术方案 | 优先级 |
|------|------|----------|--------|
| **歌词编辑** | 当前仅展示 | ▶ 时间轴对齐工具<br>▶ 在线翻译接入<br>▶ 歌词分享 (截图/文本) | 🔴 高 |
| **歌曲下载** | 无法离线收听 | ▶ PWA + Service Worker<br>▶ IndexedDB 存储音频二进制<br>⚠️ 注意版权问题 | 🟡 中 |
| **电台/FM** | 私人 FM 存在但不稳定 | ▶ 增强容错机制<br>▶ 跳过/喜欢/不喜欢的反馈循环<br>▶ AI 推荐算法优化 | 🟢 低 |
| **社交分享** | 无 | ▶ 生成海报 (封面 + 歌词二维码)<br>▶ 分享到微信/微博/朋友圈<br>▶ 好友邀请码系统 | 🟢 低 |
| **K 歌模式** | 无 | ▶ 降低原唱音量 + 提亮人声 EQ<br>▶ 录音播放对比<br>▶ 评分系统 | 🟢 低 |

#### **C3. 创意差异化功能**
| 功能 | 描述 | 技术亮点 | 优先级 |
|------|------|----------|--------|
| **AI 智能歌单** | 根据心情/场景自动生成 | ▶ 调用 OpenAI/Claude 分析标签<br>▶ 基于 Spotify API 的情感识别 | 🔵 创新 |
| **协作播放室** | 多人共同控制播放列表 | ▶ WebSocket 实时同步<br>▶ 权限分级 (管理员/听众)<br>▶ 投票切歌机制 | 🔴 社交 |
| **音乐学习助手** | 扒谱 + 乐理教学 | ▶ 音高检测算法<br>▶ 和弦识别<br>▶ 与 YouTube 教程联动 | 🔵 教育 |
| **AR 音乐现场** | 手机摄像头捕捉现实物体并映射特效 | ▶ AR.js / WebXR<br>▶ 物体追踪 + 粒子附着 | 🔵 前瞻 |
| **每日音乐日记** | AI 总结听歌感悟 | ▶ NLP 分析歌词情感<br>▶ 生成「今日心绪报告」 | 🟡 情感 |

---

### 🐛 **D. 微漏洞与边界条件**

#### **D1. Bug 修复**
| Bug | 影响范围 | 修复建议 | 优先级 |
|-----|----------|----------|--------|
| **搜索历史未去重** | `app/search/page.tsx` | 已有去重逻辑，需测试边界 (连续相同搜索) | 🟢 低 |
| **Cookie 登录失败无指引** | `app/login/page.tsx` | 给出具体步骤：打开浏览器 → DevTools → 复制 MUSIC_U | 🔴 高 |
| **扫码风控拦截不明确** | `login/page.tsx` | 8821 错误增加帮助文档链接 | 🟡 中 |
| **音量条拖拽卡顿** | `PlayerBar.tsx` | 添加防抖 (100ms), 减少 rAF 中的重绘 | 🟡 中 |
| **倍速切换有破音** | `GlobalAudioEngine.tsx` | Web Audio API 的 PlaybackRate 在某些浏览器有 bug，需降级方案 | 🔴 高 |

#### **D2. 边缘情况处理**
| 场景 | 当前表现 | 优化建议 | 优先级 |
|------|----------|----------|--------|
| **网络突然断开** | Toast 提示但未暂停 | ▶ 检测 `navigator.onLine`<br>▶ 断网时禁止切歌、显示离线状态 | 🔴 高 |
| **音频文件损坏** | 直接卡住 | ▶ 增加 `canplay` 检测<br>▶ 5 秒未缓冲成功自动跳过 | 🟡 中 |
| **歌曲版权过期** | 切歌但无提示 | ▶ 明确提示「歌曲因版权下架」 | 🟡 中 |
| **跨域音频请求** | CORS 报错 | ▶ 服务端统一设置 CORS header | 🟠 高 |
| **iOS Safari 自动播放限制** | 无声 | ▶ 首次触碰后初始化 AudioContext | 🔴 高 |

---

### 🔐 **E. 安全与合规**

| 风险点 | 描述 | 修复建议 | 优先级 |
|--------|------|----------|--------|
| **XSS 攻击面** | 用户输入未过滤 | ▶ 搜索关键词 HTML 转义<br>▶ 评论区 sanitize | 🟠 高 |
| **CSRF 风险** | API 调用无 token | ▶ 服务端增加 CSRF token 验证 | 🟡 中 |
| **PWA 安全问题** | 离线缓存可能泄露 | ▶ 敏感数据不上锁屏<br>▶ IndexedDB 加密存储 | 🟢 低 |

---

### 📦 **F. 开发体验与工程化**

#### **F1. 代码质量**
| 问题 | 建议 | 优先级 |
|------|------|--------|
| **TypeScript 类型不够精细** | `netEase.ts` 增加泛型约束 | 🟢 低 |
| **ESLint 规则单一** | 启用 `react-hooks/exhaustive-deps` 强制检查 | 🟡 中 |
| **缺少单元测试** | Vitest + React Testing Library 覆盖核心逻辑 | 🔴 高 |
| **无 E2E 测试** | Playwright 模拟真实用户流程 | 🔴 高 |

#### **F2. 文档建设**
| 缺失内容 | 建议 | 优先级 |
|----------|------|--------|
| **README.md** | 安装指南 + 功能介绍 + 贡献规范 | 🔴 高 |
| **API 文档** | Next.js API Routes 使用说明 | 🟡 中 |
| **组件库文档** | Storybook 搭建 UI 组件库 | 🟢 低 |

---

## 🚀 三、后续开发路线图

### **Phase 1: 稳定性打磨 (Sprint 1-2)**
**目标**: 修复关键 Bug，提升产品可用性
- [ ] 断网状态检测与降级
- [ ] iOS Safari 自动播放兼容性
- [ ] Cookie 登录指引优化
- [ ] 骨架屏加载体验提升
- [ ] 内存泄漏排查

**预计耗时**: 10~15 工作日

---

### **Phase 2: UI/UX 全面升级 (Sprint 3-4)**
**目标**: 打造一致性的设计规范，完善响应式布局
- [ ] Design System 建立 (色彩/字体/间距)
- [ ] 移动端优先重构
- [ ] 触摸手势优化
- [ ] 空状态/错误页设计
- [ ] 动画性能调优

**预计耗时**: 12~18 工作日

---

### **Phase 3: 核心功能深化 (Sprint 5-7)**
**目标**: 完善收藏、歌词、队列三大模块
- [ ] 云端收藏同步 (Supabase/Firebase)
- [ ] 歌词编辑器 (时间轴对齐)
- [ ] 播放队列拖拽排序
- [ ] 历史记录统计分析

**预计耗时**: 18~25 工作日

---

### **Phase 4: 创新功能探索 (Sprint 8-10)**
**目标**: 打造差异化竞争力
- [ ] PWA 离线模式
- [ ] 协作播放室 (WebSocket)
- [ ] AI 智能歌单
- [ ] 音乐日报生成

**预计耗时**: 20~30 工作日

---

### **Phase 5: 工程化与规模化 (Sprint 11-12)**
**目标**: 提升开发效率，支撑长期演进
- [ ] 单元测试覆盖率达 80%
- [ ] E2E 自动化测试
- [ ] CI/CD 流水线
- [ ] 性能监控系统

**预计耗时**: 15~20 工作日

---

## 🎯 四、立即可执行的优化清单 (本周任务)

### **优先级：🔴 紧急**
```bash
1. 修复 iOS Safari 自动播放问题
   - 文件：lib/audio/engine.ts
   - 行动：在首次触摸事件后初始化 AudioContext

2. 增加断网检测
   - 文件：hooks/useNetworkStatus.ts (新建)
   - 行动：监听 window.onoffline/ononline

3. Cookie 登录失败指引
   - 文件：app/login/page.tsx
   - 行动：添加弹窗引导复制链接粘贴
```

### **优先级：🟡 重要**
```bash
1. 骨架屏优化
   - 文件：components/ui/StateViews.tsx
   - 行动：设计 PlaylistSkeleton/ArtistSkeleton

2. 音量条防抖
   - 文件：hooks/useDragPercent.ts (新建)
   - 行动：添加 100ms debounce

3. 搜索结果空状态
   - 文件：app/search/page.tsx
   - 行动：展示「热门搜索」引导
```

### **优先级：🟢 可选**
```bash
1. 添加快捷键说明 (？键弹出)
2. 音乐结束后播放淡出效果 (fadeout)
3. 桌面通知：新曲开始时 Toast 提示
```

---

## 📈 五、技术指标监控建议

| 指标 | 目标值 | 测量工具 |
|------|--------|----------|
| **LCP (最大内容绘制)** | < 2.5s | Google Lighthouse |
| **FID (首次输入延迟)** | < 100ms | Web Vitals |
| **CLS (累积布局偏移)** | < 0.1 | Chrome DevTools |
| **JS Bundle Size** | < 500KB | webpack-bundle-analyzer |
| **内存峰值** | < 150MB | Chrome Performance tab |

---

## 💡 六、技术债务清单

| 债务 | 风险等级 | 偿还计划 |
|------|----------|----------|
| **硬编码字符串** | 🟡 中 | i18n 国际化准备 |
| **CSS-in-JS 混用** | 🟢 低 | 全面迁移至 Tailwind |
| **缺少错误边界** | 🟠 高 | React ErrorBoundary 包装主应用 |
| **日志系统缺失** | 🟡 中 | Sentry 集成 |
| **无 A/B 测试框架** | 🟢 低 | 未来功能实验预留 |

---

## 🎬 七、总结与建议

### **核心竞争力保持**
✅ 你的项目在 **视觉沉浸感** 和 **播放流畅度** 上已经超越大部分同类应用  
✅ **WebGL 可视化** 是最大亮点，应继续投入研发打造差异化  

### **短期策略 (3 个月内)**
1. **先补短板** - 移动端适配 + 错误处理是生存线
2. **再练内功** - 性能优化 + 测试覆盖是护城河
3. **最后突围** - 创新功能是杀手锏

### **长期愿景**
🌟 定位为「下一代沉浸式音乐播放器」，而非「网易云替代品」  
🌟 考虑开源获取社区贡献，同时保留核心功能的闭源版本  

---

## 🖥️ 八、G. PC 客户端开发计划（Tauri 2）

> **已确认决策（2026-11-08）**
> 1. **架构**：加载本地打包产物，离线可用（不依赖线上站点）
> 2. **框架**：Tauri 2.x，接受少量 Rust 代码
> 3. **平台**：Windows / macOS / Linux 全平台

### G0. 关键技术约束（勘察结论）

| 约束 | 影响 |
|------|------|
| 23 个 `app/api/*/route.ts` 是服务端 Route Handler | `output: 'export'` 纯静态导出会**丢失全部 API**，桌面端必须有本地 API 提供方 |
| `lib/api.ts` 全部使用相对路径 fetch | 对「本地 sidecar 提供 API」天然友好，方案 A 仅需加 `API_BASE` 前缀 |
| `next/image` remotePatterns 走服务端图片优化器 | 方案 A 需 `images.unoptimized: true`；方案 B 无影响 |
| 音频引擎/播放状态全在 Web 层（store + audioEngine） | 桌面集成只需「包壳 + 系统对接」，无需改动播放核心 |

### G1. 实现方案二选一（待拍板）

| | **方案 B：Next standalone 整体 sidecar（推荐起步）** | **方案 A：静态 UI + 轻量 API sidecar（精简演进）** |
|---|---|---|
| 做法 | Tauri 内嵌 `next build` standalone 产物 + Node 运行时作为 sidecar 进程，webview 加载 `http://127.0.0.1:<port>` | UI 纯静态导出直接进 webview；提取 23 个 API 路由为独立轻量 sidecar（Hono/Express + NeteaseCloudMusicApi，Bun compile 单二进制） |
| 代码改动 | **零改动** | API_BASE 配置 + unoptimized + 类型层拆分 |
| 行为一致性 | 与 web 部署 100% 一致（同产物） | 双构建目标，存在漂移风险 |
| 体积 | 安装包 ~80-120MB（含 Node sidecar） | 安装包 ~25-50MB |
| 结论 | **Phase 1 先做 B**，跑通全链路 | 体积敏感时再演进到 A |

### G2. 阶段计划

> **✅ 2026-11-08 进度**：Phase 0 / 1 / 1.5 / 2 / 3 全部完成。
> - 环境：Rust 1.99.1-msvc（rsproxy 镜像）+ MSVC 14.44 + WebView2 ✅
> - 壳工程：无边框窗口 + 自定义标题栏（Navbar 拖拽区 + 右上三按钮，invoke 直连）✅
> - sidecar 链路：随机端口 → node.exe → Next standalone → 窗口导航 ✅
> - 桌面集成：系统托盘（播放控制/显示/退出）、关闭最小化到托盘、单实例锁 ✅
> - **ACL 关键坑**：sidecar URL（127.0.0.1:动态端口）不是 "local"，需 capabilities/sidecar.json 用 remote.urls 放行 ✅
> - 安装包：NSIS 雅枫音乐_0.1.0_x64-setup.exe（35.5MB，release exe 12MB）✅
> - UI 修复：歌词浮窗底部锚定 520px 紧凑面板、队列抽屉让位标题栏、可视化页左右布局（圆环左/歌词右 flex 主体）✅
> > - **Phase 4 已完成**：updater 插件 + 签名密钥对 + GitHub Actions（tag → 构建/签名/Release/latest.json）+ UpdateChecker UI ✅
> - 数据持久化方案 B（Tauri Store 文件）落地；like 云端同步语义反转修复；♥ 直写网易云「喜欢的音乐」✅
> - **待办**：GitHub remote 接入 + 首次 push + Secrets 配置、macOS/Linux CI 矩阵、回到 web 侧执行 D→B→C→F→E

- **Phase 0 前置勘察（0.5 天）**：安装 Rust 工具链验证；`pnpm tauri init` PoC 壳加载 localhost:3000；确认 Next standalone 可被 sidecar 启动
- **Phase 1 壳工程（2-3 天）**：`desktop/src-tauri` 建立双产物构建（dev: next dev / prod: standalone sidecar）；窗口配置（尺寸/最小尺寸/记住位置）；无边框窗口 + 自定义标题栏（匹配玻璃拟态风格）
- **Phase 2 桌面集成（3-5 天）**：系统托盘（播放/暂停/切歌/退出菜单）；关闭最小化到托盘；媒体键 + 系统媒体浮层对接（见 G3 平台矩阵）；单实例锁；开机自启（可选开关）
- **Phase 3 打包分发（2-3 天）**：tauri-plugin-updater 自动更新（签名密钥）；GitHub Actions 三平台矩阵构建（NSIS/MSI、dmg、AppImage/deb）；版本号与 web 产物 lockstep
- **Phase 4 同步机制（持续）**：monorepo 内 `desktop/` 跟随主仓演进；web CI 产物同时喂桌面打包；tag 一次发三端

### G3. 平台能力矩阵

| 能力 | Windows | macOS | Linux |
|------|---------|-------|-------|
| WebView | WebView2（Win10/11 内置） | WKWebView（内置） | webkit2gtk（需依赖） |
| 安装格式 | NSIS / MSI | .app / .dmg | AppImage / deb / rpm |
| 系统媒体浮层 | SMTC（windows-rs） | MPRemoteCommandCenter | MPRIS (dbus) |
| 更新签名 | 无强制签名 | ⚠️ 需 Apple Developer $99/年 + 公证 | 无强制签名 |
| 风险点 | 低 | 签名公证成本、未签名分发有 Gatekeeper 提示 | 各发行版 webkit2gtk 版本差异 |

### G4. 风险清单

> **实战补充（2026-11-08）**
> - **sidecar remote capability**：Tauri ACL 默认只对 "local" URL 放权，sidecar 的 http://127.0.0.1:* 必须用 `remote.urls` 单独声明 capability，否则 JS 侧窗口/托盘调用全部被拒（表现为"按钮无响应"）
> - **前端改代码必须重跑 build.cmd**：桌面壳内嵌 standalone 是构建时快照，托盘→前端桥接（DesktopBridge）依赖产物里的全局分发器
> - **cmd 批处理必须 CRLF+ASCII**：LF 换行或 UTF-8 中文注释会让 cmd.exe 解析错位（表现为"找不到 exe"）

1. **Rust 侧媒体会话集成**：SMTC/MPRIS 无官方 Tauri 插件，需自写或用社区 crate —— Phase 2 先做 Windows（用户主环境），macOS/Linux 后置
2. **Node sidecar 体积**：若不可接受，走方案 A 或用 Bun compile 压缩 sidecar
3. **CORS/代理行为**：sidecar 监听 127.0.0.1 随机端口，端口注入通过 Tauri invoke 传给前端，避免固定端口冲突
4. **macOS 公证**：无开发者账号则 dmg 分发带「右键打开」引导文档

**文档维护者**: AI Code Agent  
**下次评审日期**: 2026-12-30 (季度复盘)

### G5. Phase 4：自动更新体系（已实施）

**工作原理**：客户端启动 8s 后调用 GitHub Releases 上的 `latest.json`（含最新版本号/下载地址/签名）。
比对本地版本 → 有新版 → 右下角弹条自动下载（进度条）→ 用户点「立即重启安装」→ NSIS passive 模式静默升级。
所有更新包必须带 Ed25519 签名，客户端用内置公钥验签，防止更新劫持。

**已落地的组件**：

| 组件 | 位置 | 作用 |
|---|---|---|
| 签名密钥对 | `~/.tauri/yafeng.key(.pub)` | 私钥签名更新包（**仅本地保管，不入库**）；公钥已写入 tauri.conf.json |
| updater 插件 | src-tauri（Cargo + capabilities） | Rust 侧检查/下载/验签/安装 |
| UpdateChecker UI | components/updater/UpdateChecker.tsx | 弹条/进度/重启安装（仅桌面环境渲染） |
| CI 工作流 | .github/workflows/release.yml | push `v*` tag 自动：构建 → TAURI_SIGNING_PRIVATE_KEY 签名 → 发 GitHub Release → 生成 latest.json + zip |
| 更新清单端点 | releases/latest/download/latest.json | 客户端版本检查入口 |

**你以后发新版的标准流程**：

1. 改完代码，本地验证：`desktop\build.cmd`（debug）跑通
2. 升版本号：`src-tauri/tauri.conf.json` 的 `version`（如 0.1.0 → 0.2.0）
3. 提交并打 tag：`git push origin master --tags`（tag 形如 `v0.2.0`）
4. GitHub Actions 自动构建发布（约 8-12 分钟）
5. 老用户的客户端会在下次启动时收到更新提示，一键升级

**GitHub 仓库一次性配置（HAN102300/yafeng-music）**：

1. remote 接入：`git remote add origin https://github.com/HAN102300/yafeng-music.git`
2. 配置 Secret（仓库 Settings → Secrets and variables → Actions → New repository secret）：
   - Name: `TAURI_SIGNING_PRIVATE_KEY`
   - Value: `~/.tauri/yafeng.key` 文件的完整内容（-----BEGIN MINISIGN SIGNING KEY 开头到结尾）
3. 首次推送：`git push -u origin master`
4. 此后每次发版走第 2 步之后的标准流程

**注意事项**：
- 私钥丢失 = 已发布客户端永远无法收到你的签名更新（只能重装）。务必备份 `~/.tauri/yafeng.key`
- `latest.json` 的 platforms 键必须是 `windows-x86_64`（Tauri updater 运行时约定）
- NSIS 安装包需 zip 后发布（updater 下载的是 zip，解压后运行 setup）
- GitHub 直连失败时用户的更新检查会静默失败（不影响使用），下轮启动重试
