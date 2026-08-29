# 四项修复 + 个人音乐中心实施计划

## 〇、扫码登录 bug 调研结论（已对照权威实现逐字确认）

参考 NeteaseCloudMusicApi（npm 最新版）源码，我的实现有 3 处错误：
1. **二维码内容错误（主因）**：我把裸 unikey 字符串放进二维码。App 只识别 `https://music.163.com/login?codekey=<unikey>` 格式 → 扫码报"不支持的类型"
2. unikey 创建参数应为 `{ type: 3 }`（数字，新版 App 扫码渠道），我传了字符串 `'1'`
3. 轮询参数应为 `{ key, type: 3 }`，同样传错

## 一、修复扫码登录（lib/server/netEase.ts + app/login/page.tsx）

- `createQrKeyNetEase`: weapi 数据改为 `{ type: 3 }`
- `checkQrKeyNetEase`: weapi 数据改为 `{ key, type: 3 }`
- 登录页二维码 value 改为 `https://music.163.com/login?codekey=${unikey}`
- 实测：生成二维码后用页面脚本读取 QR 内容确认格式正确、轮询返回 801 等待态（服务端认可该 key）；真实扫码需你用手机验证

## 二、排行榜左侧榜单固定（app/musictop/page.tsx）

- 左右分栏容器加 `lg:items-start`（防 flex 拉伸破坏 sticky）
- 左侧榜单列加 `lg:sticky lg:top-24 lg:max-h-[calc(100vh-140px)]`——滚动时左栏钉在顶部，仅右侧曲目滚动（移动端横向滑动布局不变）

## 三、弹层滚动穿透修复

- 新建 `hooks/useBodyScrollLock.ts`：弹层挂载期间锁定 body overflow
- `QueueDrawer`（队列抽屉）与 `LyricsOverlay`（歌词浮层）接入；滚动容器加 `overscroll-contain` 防滚动链
- 处理 lenis 平滑滚动协调（SmoothScroll 实例 stop/start）

## 四、个人音乐中心（回答：此前仅 Navbar 菜单有"我的歌单"简表；本次补全为完整能力）

- 数据层：`NetEasePlaylist` 增加 `creatorId`；新增收藏专辑接口 `/weapi/album/sublist`、专辑详情 `/weapi/v1/album/{id}`（服务端函数 + 2 个 Route Handler + 客户端封装）
- 新页面 **/mine 我的音乐**：三个 tab——创建的歌单 / 收藏的歌单 / 收藏的专辑（未登录显示扫码引导）
- 新页面 **/album/[id] 专辑详情**：封面头图 + 曲目列表，复用 TrackList 整列入队
- Navbar 用户菜单新增「我的音乐」入口

## 五、扩展功能头脑风暴（仅建议，不在本次实施范围）

- **内容类**：歌曲/歌单热门评论、MV 播放、相似歌曲/相似歌单推荐、歌词翻译
- **互动类**：收藏歌单/专辑/歌手（云端 /subscribe 系列）、云贝签到、听歌排行
- **体验类**：均衡器 EQ（Web Audio BiquadFilter）、桌面歌词、移动端左右滑切歌、歌曲分享卡片（canvas 生成）
- **数据类**：听歌统计面板（基于已有 history：最听歌手/时段热力图）、歌单导入导出
- **工程类**：PWA 离线、i18n、键盘全导航无障碍

## 验证与提交

每项改完浏览器实测 → lint/tsc/build 全绿 → 一次 git 提交。

Sources: [NeteaseCloudMusicApi (npm)](https://www.npmjs.com/package/NeteaseCloudMusicApi)、[官方文档站](https://binaryify.github.io/NeteaseCloudMusicApi/)