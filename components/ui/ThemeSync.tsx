'use client';

/**
 * 主题同步（无头，挂根布局）
 * store.themeId 变化 → 应用 data-theme；同时清掉音频引擎可能残留的内联变量，
 * 避免旧主题色覆盖新主题的 CSS 规则（播放中引擎会在下一帧按新主题重新写入）。
 */
import { useEffect } from 'react';
import { useMusicStore } from '@/lib/store';
import { applySiteTheme } from '@/lib/themes';

export default function ThemeSync() {
  const themeId = useMusicStore((s) => s.themeId);

  useEffect(() => {
    applySiteTheme(themeId);
    // 清除内联覆盖，让 [data-theme] 规则生效
    const root = document.documentElement.style;
    root.removeProperty('--color-primary');
    root.removeProperty('--color-primary-light');
    root.removeProperty('--color-accent');
    root.removeProperty('--glow-primary');
  }, [themeId]);

  return null;
}
