'use client';

/**
 * 主题切换器：Navbar 调色板下拉
 * - 深色 5 套 + 浅色 5 套 分组展示
 * - 顶部快速切换按钮：一键跳到当前主题的明暗配对主题
 */
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMusicStore } from '@/lib/store';
import { THEMES, getTheme, type SiteTheme } from '@/lib/themes';

function ThemeChip({
  theme,
  active,
  onClick,
}: {
  theme: SiteTheme;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left ${
        active ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      <span
        className="w-7 h-7 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-transparent transition-all"
        style={{
          background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary} 55%, ${theme.accent})`,
          boxShadow: `0 0 10px ${theme.primary}66`,
          // @ts-expect-error 动态 ring 颜色
          '--tw-ring-color': active ? theme.primary : 'transparent',
        }}
      />
      <span className={`text-sm ${active ? 'text-white font-medium' : 'text-white/60'}`}>
        {theme.name}
      </span>
      {active && (
        <svg className="w-4 h-4 ml-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

export default function ThemeSwitcher() {
  const themeId = useMusicStore((s) => s.themeId);
  const setThemeId = useMusicStore((s) => s.setThemeId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = getTheme(themeId);
  const darkThemes = THEMES.filter((t) => t.mode === 'dark');
  const lightThemes = THEMES.filter((t) => t.mode === 'light');

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const quickToggle = () => {
    setThemeId(current.pairId);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white"
        title="切换主题"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full mt-2 w-56 glass-panel rounded-2xl p-2 shadow-2xl shadow-black/50 z-50"
          >
            {/* 快速明暗切换 */}
            <button
              onClick={quickToggle}
              className="w-full flex items-center justify-between px-3 py-2 mb-1 rounded-xl bg-pri-mix-10 hover:bg-pri-mix-18 transition-colors text-left"
            >
              <span className="text-sm text-white/80">
                {current.mode === 'dark' ? '☀️ 切换到浅色' : '🌙 切换到深色'}
              </span>
              <span className="text-xs text-white/40">
                {getTheme(current.pairId).name} →
              </span>
            </button>

            <div className="max-h-72 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
              <p className="px-3 pt-1.5 pb-1 text-xs text-white/30">🌙 深色</p>
              {darkThemes.map((t) => (
                <ThemeChip
                  key={t.id}
                  theme={t}
                  active={themeId === t.id}
                  onClick={() => {
                    setThemeId(t.id);
                    setOpen(false);
                  }}
                />
              ))}
              <p className="px-3 pt-2 pb-1 text-xs text-white/30 border-t border-white/10 mt-1">☀️ 浅色</p>
              {lightThemes.map((t) => (
                <ThemeChip
                  key={t.id}
                  theme={t}
                  active={themeId === t.id}
                  onClick={() => {
                    setThemeId(t.id);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
