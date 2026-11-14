'use client';

/**
 * 检查更新按钮（设置页 · 关于区块，仅桌面端渲染）
 *
 * 完整状态机：
 *   idle → checking → uptodate（已是最新）/ available（发现新版本）/ error（检查失败）
 *   available → downloading（进度条）→ ready（重启安装）
 *
 * 动画：状态切换 AnimatePresence 淡入淡出；检查中旋转圆环；进度条平滑过渡；
 *       按钮 whileHover/whileTap 微缩放；结果文案自动回落（uptodate/error 3s 后归位）。
 *
 * 手动检查语义：忽略「跳过此版本」偏好（用户主动点击视为明确想看结果）。
 * 测试钩子：localStorage.setItem('yafeng:update-sim', '1') 后走模拟流程，
 *          不发起真实下载（供发版前验证「发现新版本→下载→就绪」的完整流转）。
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from '@/lib/toast';

type Phase = 'idle' | 'checking' | 'uptodate' | 'available' | 'downloading' | 'ready' | 'error';

interface DownloadEvent {
  event: string;
  data: { chunkLength?: number; contentLength?: number };
}

interface UpdateHandle {
  version: string;
  download: (onEvent?: (evt: DownloadEvent) => void) => Promise<void>;
}

const SIM_KEY = 'yafeng:update-sim';

export function CheckUpdateButton() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [version, setVersion] = useState('');
  const [progress, setProgress] = useState(0);
  const [sim, setSim] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const updateRef = useRef<UpdateHandle | null>(null);
  const busyRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setIsDesktop(typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window);
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  /** 归位到 idle（清理回落定时器） */
  const scheduleReset = (ms: number) => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setPhase('idle'), ms);
  };

  const runCheck = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setPhase('checking');

    // ---- 模拟流程（测试钩子）----
    if (typeof window !== 'undefined' && localStorage.getItem(SIM_KEY) === '1') {
      setSim(true);
      setTimeout(() => {
        setVersion('9.9.9');
        setPhase('available');
        toast('模拟：发现新版本 v9.9.9', 'info');
        busyRef.current = false;
      }, 1200);
      return;
    }

    // ---- 真实检查 ----
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const result = await check();
      if (!result) {
        setPhase('uptodate');
        toast('已是最新版本 🎉', 'success');
        scheduleReset(3000);
      } else {
        setVersion(result.version);
        updateRef.current = {
          version: result.version,
          download: (onEvent) => result.downloadAndInstall(onEvent as never) as never,
        };
        setPhase('available');
        toast(`发现新版本 v${result.version}`, 'info');
      }
    } catch (err) {
      console.error('[check-update] failed', err);
      setPhase('error');
      toast('检查更新失败（网络异常或服务不可达）', 'error');
      scheduleReset(3000);
    } finally {
      busyRef.current = false;
    }
  };

  const startDownload = async () => {
    const upd = updateRef.current;
    if (!upd || busyRef.current) return;

    // ---- 模拟下载（测试钩子）----
    if (sim) {
      busyRef.current = true;
      setPhase('downloading');
      setProgress(0);
      let p = 0;
      simTimerRef.current = setInterval(() => {
        p += Math.random() * 18 + 6;
        if (p >= 100) {
          if (simTimerRef.current) clearInterval(simTimerRef.current);
          setProgress(100);
          setPhase('ready');
          toast('模拟：下载完成', 'success');
          busyRef.current = false;
        } else setProgress(Math.round(p));
      }, 320);
      return;
    }

    // ---- 真实下载 ----
    busyRef.current = true;
    setPhase('downloading');
    setProgress(0);
    let total = 0;
    let received = 0;
    try {
      await upd.download((evt) => {
        if (evt.event === 'Started') {
          total = evt.data.contentLength ?? 0;
          received = 0;
        } else if (evt.event === 'Progress') {
          received += evt.data.chunkLength ?? 0;
          setProgress(total > 0 ? Math.round((received / total) * 100) : 0);
        } else if (evt.event === 'Finished') {
          setProgress(100);
          setPhase('ready');
          toast(`v${upd.version} 下载完成，可重启安装`, 'success');
        }
      });
    } catch (err) {
      console.error('[check-update] download failed', err);
      toast('下载失败，请稍后重试', 'error');
      setPhase('idle');
    } finally {
      busyRef.current = false;
    }
  };

  const relaunch = async () => {
    if (sim) {
      toast('模拟模式：不执行真实重启', 'info');
      return;
    }
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (err) {
      console.error('[check-update] relaunch failed', err);
      toast('重启失败，请手动重启应用', 'error');
    }
  };

  if (!isDesktop) return null;

  const checking = phase === 'checking';
  const downloading = phase === 'downloading';

  const phaseText: Partial<Record<Phase, { text: string; cls: string }>> = {
    uptodate: { text: '✓ 已是最新版本', cls: 'text-emerald-300' },
    available: { text: `发现新版本 v${version}，点击「立即更新」下载`, cls: 'text-white/70' },
    downloading: { text: `正在下载 v${version}… ${progress}%`, cls: 'text-white/70' },
    ready: { text: `v${version} 已就绪，重启即完成安装`, cls: 'text-emerald-300' },
    error: { text: '检查失败，请检查网络后重试', cls: 'text-red-300' },
  };
  const info = phaseText[phase];

  return (
    <div data-no-drag className="pt-3 mt-1 border-t border-white/10">
      <div className="flex items-center gap-3 flex-wrap">
        <motion.button
          whileHover={!checking && !downloading ? { scale: 1.04 } : undefined}
          whileTap={!checking && !downloading ? { scale: 0.95 } : undefined}
          onClick={runCheck}
          disabled={checking || downloading}
          className={
            'relative px-4 py-2 rounded-xl text-sm font-medium border flex items-center gap-2 transition-colors ' +
            (checking || downloading
              ? 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed'
              : 'bg-pri-mix-18 border-pri-mix-45 text-white hover:bg-pri-mix-25')
          }
        >
          {checking ? (
            <motion.span
              className="w-3.5 h-3.5 rounded-full border-2 border-white/25 border-t-acc inline-block"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, ease: 'linear', repeat: Infinity }}
            />
          ) : (
            <span className="text-base leading-none">⟳</span>
          )}
          {checking ? '检查中…' : downloading ? '下载中…' : '检查更新'}
        </motion.button>

        {/* 状态文案（除 available/downloading/ready 外 3s 自动归位） */}
        <AnimatePresence mode="wait">
          {info && (
            <motion.span
              key={phase}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              className={'text-xs ' + info.cls}
            >
              {info.text}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* 下载进度条（spring 平滑） */}
      <AnimatePresence>
        {downloading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-primary"
                animate={{ width: progress + '%' }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* available / ready 的行动按钮 */}
      <AnimatePresence mode="wait">
        {phase === 'available' && (
          <motion.div
            key="avail-actions"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2 mt-3"
          >
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={startDownload}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-gradient-primary text-white on-accent"
            >
              立即更新
            </motion.button>
            <button
              onClick={() => setPhase('idle')}
              className="px-3 py-1.5 rounded-lg text-xs text-white/45 hover:text-white/80 transition-colors"
            >
              稍后
            </button>
          </motion.div>
        )}
        {phase === 'ready' && (
          <motion.div
            key="ready-actions"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2 mt-3"
          >
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={relaunch}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-gradient-primary text-white on-accent"
            >
              重启并安装
            </motion.button>
            <button
              onClick={() => setPhase('idle')}
              className="px-3 py-1.5 rounded-lg text-xs text-white/45 hover:text-white/80 transition-colors"
            >
              稍后再说
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {sim && (
        <p className="text-[10px] text-amber-300/70 mt-2">
          模拟模式（localStorage {SIM_KEY}）· 不会真实下载安装
        </p>
      )}
    </div>
  );
}
