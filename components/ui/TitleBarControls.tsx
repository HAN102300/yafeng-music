'use client';

/**
 * 桌面端自定义标题栏（仅 Tauri 无边框窗口渲染）
 * 通过 __TAURI_INTERNALS__.invoke 直连窗口控制（不经打包器，稳定可用）
 */
import { useEffect, useState } from 'react';
import { isDesktop, winMinimize, winToggleMaximize, winClose } from '@/lib/desktop';

export function TitleBarControls() {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    setDesktop(isDesktop());
  }, []);

  if (!desktop) return null;

  const btn =
    'w-11 h-9 flex items-center justify-center text-white/55 hover:text-white transition-colors';

  return (
    <div className="fixed top-0 right-0 z-[70] flex items-center h-12 select-none">
      <button
        aria-label="最小化"
        className={btn + ' hover:bg-white/10'}
        onClick={() => winMinimize()}
      >
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 6h10" stroke="currentColor" strokeWidth="1.2" /></svg>
      </button>
      <button
        aria-label="最大化/还原"
        className={btn + ' hover:bg-white/10'}
        onClick={() => winToggleMaximize()}
      >
        <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>
      </button>
      <button
        aria-label="关闭"
        className={btn + ' hover:bg-[#e81123] hover:text-white'}
        onClick={() => winClose()}
      >
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.2" /></svg>
      </button>
    </div>
  );
}
