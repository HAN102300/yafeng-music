# 雅枫音乐桌面客户端（Tauri 2）

## 架构（方案 B：Next standalone sidecar）

```
yafeng-music.exe (Tauri 壳, WebView2)
 ├── 启动时: 随机空闲端口 + sidecar 启动内嵌 node.exe
 ├── node server.js  ← src-tauri/resources/next-server/ (Next standalone, 含 23 个 API 路由)
 ├── 端口就绪探测 (15s 超时)
 └── 主窗口 navigate → http://127.0.0.1:<port>   完全离线可用
```

## 构建

```bat
desktop\build.cmd            :: 调试 exe（最快）
desktop\build.cmd release    :: 优化 exe
desktop\build.cmd installer  :: NSIS 安装包
```

## 开发调试

- Web dev: 根目录 `npm run dev`（localhost:3000）
- PoC 模式: tauri.conf.json 中 build.devUrl 已指向 localhost:3000，
  `npx tauri dev` 时窗口加载 dev server（热更新）
- sidecar 模式: 直接运行 build.cmd 产物（离线完整版）

## 关键文件

| 文件 | 作用 |
|---|---|
| src-tauri/src/lib.rs | sidecar 启动/端口探测/窗口导航（含 [yafeng] 诊断日志） |
| src-tauri/binaries/node-x86_64-pc-windows-msvc.exe | sidecar 二进制源（从系统 node.exe 复制） |
| src-tauri/tauri.conf.json | externalBin + resources 映射 + 窗口配置 |
| desktop/app-icon/icon-source.png | 图标源（1024² 方形，tauri icon 生成全套） |

## 注意事项

- **node.exe 版本跟随**：sidecar 直接复制系统的 node.exe（D:\Java_software\NodeJS\node.exe），
  Node 大版本升级后需重新复制
- **首次 npm install 后**：需重跑 build.cmd（standalone 产物随依赖变化）
- **macOS/Linux**：待适配（icon.icns 已生成；需替换 sidecar 二进制为对应平台 node，
  CI 矩阵构建时用各平台官方 node 二进制）
- **诊断**：启动异常看 stderr 的 [yafeng] / [next] 前缀日志

## Rust ↔ Web 桥接（托盘播放控制）

- Rust 托盘菜单事件 → `win.eval("window.__YAFENG_DESKTOP_CMD__('toggle-play')")`
- 前端 `components/player/DesktopBridge.tsx`（挂在 app/layout）注册 `window.__YAFENG_DESKTOP_CMD__`
  并分发到 zustand store（togglePlay/next/prev）
- **⚠️ 修改前端代码后必须重跑 `desktop\build.cmd`**，否则内嵌产物是旧版、托盘播放控制会失效
  （显示窗口/退出是纯 Rust 侧功能，不受影响——这正是排查时的鉴别特征）

## NSIS 环境手工搭建（网络受限时的恢复方法）

Tauri 打 NSIS 包前会校验 `%LOCALAPPDATA%\tauri\NSIS` 的文件清单+hash，缺失/不匹配时自动重新下载
（GitHub 直连在国内常 504/超时）。手工恢复步骤：

1. 下载官方包（curl 直连可用）：
   `curl -L -o nsis-3.13.zip https://github.com/tauri-apps/binary-releases/releases/download/nsis-3.13/nsis-3.13.zip`
2. `tar -xf nsis-3.13.zip -C %LOCALAPPDATA%\tauri` 然后把 `nsis-3.13` 目录改名 `NSIS`
3. 下载 Tauri 插件（版本必须与 CLI 匹配，当前 cli 2.12.4 → v0.5.3）：
   `curl -L -o nsis_tauri_utils.dll https://github.com/tauri-apps/nsis-tauri-utils/releases/download/nsis_tauri_utils-v0.5.3/nsis_tauri_utils.dll`
4. 放到 `%LOCALAPPDATA%\tauri\NSIS\Plugins\x86-unicode\additional\nsis_tauri_utils.dll`
5. 重跑 `desktop\build.cmd installer`

清单校验项（从 cli 二进制提取）：Bin/makensis.exe、Stubs/lzma-x86-unicode、
Stubs/lzma_solid-x86-unicode、Plugins/x86-unicode/additional/nsis_tauri_utils.dll、
Include/{MUI2,FileFunc,x64,nsDialogs,WinMessages}.nsh、Include/Win/{COM,Propkey,RestartManager}.nsh


## 数据持久化（方案 B：Tauri Store 文件）

| 数据 | Web 端 | 桌面端 |
|---|---|---|
| 播放状态/收藏/历史/主题等（zustand persist） | localStorage | **userData/yafeng-data.json**（lib/desktopStorage.ts 双通道） |
| 网易云登录态 MUSIC_U + profile | localStorage | yafeng-data.json（ncmAuth 双写）+ 启动时 DesktopBridge 恢复回 localStorage |
| 搜索历史 | localStorage | yafeng-data.json（search 页直接走 desktopStorage） |

- 桌面数据与 origin/端口**完全无关**：重启、升级、重装均保留
- 卸载默认保留用户数据；如需彻底清除删除 `%APPDATA%\com.yafeng.music\` 目录
- `yafeng-data.json` 实际路径：`C:\Users\<user>\AppData\Roaming\com.yafeng.music\yafeng-data.json`
