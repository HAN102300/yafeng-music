'use client';

/**
 * 主题切换器：Navbar 调色板下拉，5 套年轻化配色实时切换
 */
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMusicStore } from '@/lib/store';
import { THEMES } from '@/lib/themes';

export default function ThemeSwitcher() {
  const themeId = useMusicStore((s) => s.themeId);
  const setThemeId = useMusicStore((s) => s.setThemeId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

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
            className="absolute right-0 top-full mt-2 w-52 glass-panel rounded-2xl p-2 shadow-2xl shadow-black/50 z-50"
          >
            <p className="px-3 py-1.5 text-xs text-white/30">主题配色</p>
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setThemeId(t.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left ${
                  themeId === t.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                {/* 三色渐变球 */}
                <span
                  className="w-7 h-7 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-transparent transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${t.primary}, ${t.secondary} 55%, ${t.accent})`,
                    boxShadow: `0 0 10px ${t.primary}66`,
                    // @ts-expect-error 动态 ring 颜色
                    '--tw-ring-color': themeId === t.id ? t.primary : 'transparent',
                  }}
                />
                <span className={`text-sm ${themeId === t.id ? 'text-white font-medium' : 'text-white/60'}`}>
                  {t.name}
                </span>
                {themeId === t.id && (
                  <svg className="w-4 h-4 ml-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
