'use client';

/**
 * 桌面端自动更新（用户完全可控版）
 * - 启动延迟 12s 静默检查（失败不打扰）
 * - 发现新版本：右下角弹条询问「立即更新 / 稍后 / 跳过此版本」，**用户点击后才下载**
 * - 下载中：进度条 + 可「最小化弹窗」（下载继续）+ 完成后由用户决定是否重启安装
 * - 「跳过此版本」记住该版本号，之后不再提示（存 Tauri Store，重启仍有效）
 * - 每次会话最多打扰一次；Web 环境不渲染
 */
import { useEffect, useRef, useState } from 'react';

interface UpdateState {
  status: 'idle' | 'available' | 'downloading' | 'ready';
  version?: string;
  progress?: number;
}

const SKIP_KEY_PREFIX = 'updater:skip-version:';

export function UpdateChecker() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' });
  const [visible, setVisible] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const updateRef = useRef<{
    download: (onEvent?: (evt: { event: string; data: { chunkLength?: number; contentLength?: number } }) => void) => Promise<void>;
  } | null>(null);
  const downloadingRef = useRef(false);

  useEffect(() => {
    setIsDesktop(typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    let cancelled = false;

    const check = async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const result = await check();
        if (cancelled || !result) return;

        // 跳过此版本检查（desktopStorage 直读 Store 文件）
        let skipVersion = '';
        try {
          const { load } = await import('@tauri-apps/plugin-store');
          const store = await load('yafeng-data.json', { autoSave: false });
          skipVersion = ((await store.get(SKIP_KEY_PREFIX + 'current')) as string) ?? '';
        } catch { /* 无 Store 时不跳过 */ }
        if (skipVersion && result.version === skipVersion) return;

        updateRef.current = {
          download: (onEvent) => result.downloadAndInstall(onEvent as never) as never,
        };
        setState({ status: 'available', version: result.version });
        setVisible(true);
      } catch (err) {
        console.error('[updater] check failed', err);
      }
    };

    // 启动 12s 后静默检查
    const t = setTimeout(check, 12000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [isDesktop]);

  const startDownload = async () => {
    const upd = updateRef.current;
    if (!upd || downloadingRef.current) return;
    downloadingRef.current = true;
    let total = 0;
    let received = 0;
    setState({ status: 'downloading', version: state.version, progress: 0 });
    try {
      await upd.download((evt) => {
        if (evt.event === 'Started') {
          total = evt.data.contentLength ?? 0;
          received = 0;
        } else if (evt.event === 'Progress') {
          received += evt.data.chunkLength ?? 0;
          setState({ status: 'downloading', version: state.version, progress: total > 0 ? Math.round((received / total) * 100) : 0 });
        } else if (evt.event === 'Finished') {
          setState({ status: 'ready', version: state.version });
        }
      });
    } catch (err) {
      console.error('[updater] download failed', err);
      downloadingRef.current = false;
      setState({ status: 'idle' });
      setVisible(false);
    }
  };

  const skipVersion = async () => {
    try {
      const { load } = await import('@tauri-apps/plugin-store');
      const store = await load('yafeng-data.json', { autoSave: false });
      await store.set(SKIP_KEY_PREFIX + 'current', state.version);
      await store.save();
    } catch { /* 忽略 */ }
    setVisible(false);
  };

  if (!isDesktop || !visible) return null;

  return (
    <div
      data-no-drag
      className="fixed bottom-[96px] right-5 z-[90] glass-panel rounded-2xl px-5 py-4 shadow-2xl shadow-black/50 border border-white/10 min-w-[300px]"
    >
      {state.status === 'available' && (
        <>
          <p className="text-sm text-white font-medium">发现新版本 v{state.version}</p>
          <p className="text-xs text-white/50 mt-1">是否下载更新？（约 36 MB，下载完成后由你决定是否重启安装）</p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={startDownload}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-gradient-primary text-white on-accent"
            >
              立即更新
            </button>
            <button
              onClick={() => setVisible(false)}
              className="px-4 py-1.5 rounded-lg text-xs text-white/50 hover:text-white"
            >
              稍后
            </button>
            <button
              onClick={skipVersion}
              className="px-3 py-1.5 rounded-lg text-xs text-white/35 hover:text-white/60"
            >
              跳过此版本
            </button>
          </div>
        </>
      )}
      {state.status === 'downloading' && (
        <>
          <p className="text-sm text-white font-medium">
            正在下载 v{state.version}... {state.progress ?? 0}%
            <span className="ml-2 text-xs text-white/35">下载完成后会再次询问</span>
          </p>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-primary rounded-full transition-all" style={{ width: (state.progress ?? 0) + '%' }} />
          </div>
          <button
            onClick={() => setVisible(false)}
            className="mt-2 text-xs text-white/40 hover:text-white/70"
          >
            收起（下载继续进行）
          </button>
        </>
      )}
      {state.status === 'ready' && (
        <>
          <p className="text-sm text-white font-medium">v{state.version} 已下载完成</p>
          <p className="text-xs text-white/50 mt-1">重启应用即可完成安装（也可以继续使用，下次启动时再询问）</p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={async () => {
                const { relaunch } = await import('@tauri-apps/plugin-process');
                await relaunch();
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-gradient-primary text-white on-accent"
            >
              重启并安装
            </button>
            <button
              onClick={() => setVisible(false)}
              className="px-4 py-1.5 rounded-lg text-xs text-white/50 hover:text-white"
            >
              稍后再说
            </button>
          </div>
        </>
      )}
    </div>
  );
}
