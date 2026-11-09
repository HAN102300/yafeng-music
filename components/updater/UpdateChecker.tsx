'use client';

/**
 * 桌面端自动更新（仅 Tauri 环境生效）
 * 启动后延迟 8s 检查一次 GitHub Releases；发现新版本右下角弹条：
 * 「发现新版本 vX.Y.Z → 立即更新 / 忽略」，下载完成后自动重启安装（passive 模式）。
 */
import { useEffect, useState } from 'react';

interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready';
  version?: string;
  progress?: number;
}

export function UpdateChecker() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' });
  const [dismissed, setDismissed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    let cancelled = false;
    let downloaded: { install: () => Promise<void> } | null = null;

    const check = async () => {
      try {
        setState({ status: 'checking' });
        const { check } = await import('@tauri-apps/plugin-updater');
        const result = await check();
        if (cancelled) return;
        if (result?.available) {
          setState({ status: 'available', version: result.version });
          // 预下载（失败不阻塞 UI，用户点"立即更新"时重试）
          let total = 0;
          let received = 0;
          void result.downloadAndInstall((evt) => {
            if (evt.event === 'Started') {
              total = evt.data.contentLength ?? 0;
              received = 0;
              setState({ status: 'downloading', version: result.version, progress: 0 });
            } else if (evt.event === 'Progress') {
              received += evt.data.chunkLength;
              setState({ status: 'downloading', version: result.version, progress: total > 0 ? Math.round((received / total) * 100) : 0 });
            } else if (evt.event === 'Finished') {
              setState({ status: 'ready', version: result.version });
            }
          }).then(() => {
            downloaded = { install: () => Promise.resolve() };
          }).catch((err) => {
            console.error('[updater] download failed', err);
            if (!cancelled) setState({ status: 'idle' }); // 静默失败，不打扰
          });
        }
      } catch (err) {
        console.error('[updater] check failed', err);
        if (!cancelled) setState({ status: 'idle' }); // 静默失败（如离线）
      }
    };

    // 延迟 8s 检查，避免抢占启动带宽
    const t = setTimeout(check, 8000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [isDesktop]);

  if (!isDesktop || dismissed) return null;
  if (state.status !== 'available' && state.status !== 'downloading' && state.status !== 'ready') return null;

  return (
    <div
      data-no-drag
      className="fixed bottom-[96px] right-5 z-[90] glass-panel rounded-2xl px-5 py-4 shadow-2xl shadow-black/50 border border-white/10 min-w-[280px]"
    >
      {state.status === 'available' && (
        <>
          <p className="text-sm text-white font-medium">发现新版本 v{state.version}</p>
          <p className="text-xs text-white/50 mt-1">后台正在下载更新包...</p>
        </>
      )}
      {state.status === 'downloading' && (
        <>
          <p className="text-sm text-white font-medium">正在下载 v{state.version}... {state.progress ?? 0}%</p>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-primary rounded-full transition-all" style={{ width: (state.progress ?? 0) + '%' }} />
          </div>
        </>
      )}
      {state.status === 'ready' && (
        <>
          <p className="text-sm text-white font-medium">更新已就绪 v{state.version}</p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={async () => {
                const { relaunch } = await import('@tauri-apps/plugin-process');
                await relaunch(); // 重启并自动运行 NSIS 安装（passive）
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-gradient-primary text-white on-accent"
            >
              立即重启安装
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-4 py-1.5 rounded-lg text-xs text-white/50 hover:text-white"
            >
              稍后
            </button>
          </div>
        </>
      )}
    </div>
  );
}
