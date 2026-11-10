'use client';

/**
 * 设置页
 * - 播放：默认音质 / 默认倍速（store 持久化，桌面端存 Tauri Store 文件）
 * - 外观：主题切换（导航栏调色盘）
 * - 桌面专属：关闭行为（托盘/退出）——仅 Tauri 环境显示
 * - 数据：清除搜索历史 / 播放历史
 * - 关于：版本、开源地址、技术栈
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMusicStore, QUALITY_OPTIONS, RATE_OPTIONS } from '@/lib/store';
import { PageHeader } from '@/components/ui/PageHeader';
import { useNcmProfile } from '@/lib/ncmAuth';
import { desktopStorage } from '@/lib/desktopStorage';

type ClosingBehavior = 'tray' | 'exit';

declare global {
  interface Window {
    __YAFENG_CLOSING_BEHAVIOR__?: ClosingBehavior;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-5 md:p-6 mb-5"
    >
      <h2 className="text-sm font-semibold text-white/80 mb-4 tracking-wide">{title}</h2>
      {children}
    </motion.section>
  );
}

function OptionRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={'px-4 py-2 rounded-xl text-sm font-medium transition-all border ' + (active
        ? 'bg-pri-mix-18 text-white border-pri-mix-45'
        : 'text-white/50 hover:text-white border-white/10 hover:bg-white/5')}
    >
      {label}
    </button>
  );
}

export default function SettingsPage() {
  const quality = useMusicStore((s) => s.quality);
  const setQuality = useMusicStore((s) => s.setQuality);
  const playbackRate = useMusicStore((s) => s.playbackRate);
  const setPlaybackRate = useMusicStore((s) => s.setPlaybackRate);
  const themeId = useMusicStore((s) => s.themeId);
  const likedCount = useMusicStore((s) => s.likedTracks.length);
  const historyCount = useMusicStore((s) => s.history.length);
  const clearHistory = useMusicStore((s) => s.clearHistory);
  const profile = useNcmProfile();

  const [isDesktop, setIsDesktop] = useState(false);
  const [closing, setClosing] = useState<ClosingBehavior>('tray');
  const [appVersion, setAppVersion] = useState('');
  const [clearMsg, setClearMsg] = useState('');

  useEffect(() => {
    const desktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    setIsDesktop(desktop);
    if (desktop) {
      void (async () => {
        try {
          const { load } = await import('@tauri-apps/plugin-store');
          const store = await load('yafeng-data.json', { autoSave: false });
          setClosing(((await store.get('app:closing-behavior')) as ClosingBehavior) ?? 'tray');
        } catch { /* 默认托盘 */ }
        try {
          const { getVersion } = await import('@tauri-apps/api/app');
          setAppVersion(await getVersion());
        } catch { setAppVersion(''); }
      })();
    }
  }, [isDesktop]);

  const changeClosing = async (v: ClosingBehavior) => {
    setClosing(v);
    window.__YAFENG_CLOSING_BEHAVIOR__ = v;
    try {
      const { load } = await import('@tauri-apps/plugin-store');
      const store = await load('yafeng-data.json', { autoSave: false });
      await store.set('app:closing-behavior', v);
      await store.save();
    } catch { /* web 无 Store */ }
  };

  const clearSearchHistory = async () => {
    await desktopStorage.removeItem('yafeng-search-history');
    window.dispatchEvent(new Event('yafeng-search-history-cleared'));
    setClearMsg('搜索历史已清除');
    setTimeout(() => setClearMsg(''), 2500);
  };

  const clearPlayHistory = () => {
    clearHistory();
    setClearMsg('播放历史已清除');
    setTimeout(() => setClearMsg(''), 2500);
  }


  return (
    <div className="max-w-3xl mx-auto relative z-10">
      <PageHeader title="设置" subtitle="个性化你的雅枫音乐" />

      {/* 播放 */}
      <Section title="播放">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-white/40 mb-2">默认音质（无损/Hi-Res 需版权与账号支持，失败自动回落）</p>
            <div className="flex flex-wrap gap-2">
              {QUALITY_OPTIONS.map((opt) => (
                <OptionRow key={opt.id} label={opt.label} active={quality === opt.id} onClick={() => setQuality(opt.id)} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-white/40 mb-2">默认倍速</p>
            <div className="flex flex-wrap gap-2">
              {RATE_OPTIONS.map((rate) => (
                <OptionRow key={rate} label={rate === 1 ? '1.0x（默认）' : rate + 'x'} active={playbackRate === rate} onClick={() => setPlaybackRate(rate)} />
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 外观 */}
      <Section title="外观">
        <p className="text-xs text-white/40 mb-2">主题（当前：{themeId}）</p>
        <div className="flex items-center gap-3 text-sm text-white/50">
          <span>使用导航栏的调色盘按钮实时切换主题，选择会自动保存并全局应用。</span>
        </div>
      </Section>

      {/* 桌面专属 */}
      {isDesktop && (
        <Section title="桌面端">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-white/40 mb-2">点击窗口关闭按钮时</p>
              <div className="flex flex-wrap gap-2">
                <OptionRow label="最小化到托盘（音乐继续）" active={closing === 'tray'} onClick={() => changeClosing('tray')} />
                <OptionRow label="直接退出应用" active={closing === 'exit'} onClick={() => changeClosing('exit')} />
              </div>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-2">应用版本</p>
              <p className="text-sm text-white/70">{appVersion ? 'v' + appVersion : '...'}</p>
            </div>
          </div>
        </Section>
      )}

      {/* 数据 */}
      <Section title="数据">
        <p className="text-xs text-white/40 mb-3">
          本地数据：喜欢 {likedCount} 首 · 播放历史 {historyCount} 条{profile ? ' · 已登录 ' + profile.nickname : ' · 未登录'}
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={clearSearchHistory} className="px-4 py-2 rounded-xl text-sm border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all">
            清除搜索历史
          </button>
          <button onClick={clearPlayHistory} className="px-4 py-2 rounded-xl text-sm border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all">
            清除播放历史
          </button>
          {clearMsg && <span className="text-xs text-green-300">{clearMsg}</span>}
        </div>
        <p className="text-xs text-white/30 mt-3">喜欢的歌曲在「喜欢」页面单独管理；登录后 ♥ 按钮直接同步网易云「喜欢的音乐」。</p>
      </Section>

      {/* 关于 */}
      <Section title="关于">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold text-xl shrink-0">雅</div>
          <div className="space-y-1.5 text-sm text-white/60">
            <p className="text-white font-semibold text-base">
              雅枫音乐 <span className="text-white/40 font-normal">{isDesktop ? (appVersion ? 'v' + appVersion + ' 桌面版' : '桌面版') : 'Web 版'}</span>
            </p>
            <p>沉浸式可视化在线音乐播放器，让音乐看得见。基于网易云音乐公开数据，支持扫码登录、七大 WebGL 可视化场景与桌面端完整体验。</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs">
              <a href="https://github.com/HAN102300/yafeng-music" target="_blank" rel="noreferrer" className="text-acc hover:underline">GitHub 开源仓库</a>
              <span className="text-white/40">Next.js 15 · React 19 · Tauri 2 · Three.js</span>
            </div>
            <p className="text-xs text-white/30 pt-1">仅供学习研究，不缓存、不持久化任何版权内容；播放能力来自网易云音乐公开接口。</p>
          </div>
        </div>
      </Section>

      <div className="text-center py-6">
        <Link href="/" className="text-sm text-white/40 hover:text-white transition-colors">返回首页</Link>
      </div>
    </div>
  );
}
