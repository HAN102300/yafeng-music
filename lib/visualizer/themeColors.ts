/**
 * 可视化场景主题色读取工具
 * 场景绘制回调每帧从 CSS 变量读取主题（由 GlobalAudioEngine 节流写入），
 * 建议消费方以 ~30 帧间隔缓存刷新，避免每帧 getComputedStyle。
 */

export interface SceneThemeColors {
  primary: string;
  accent: string;
  glow: string;
}

const DEFAULTS: SceneThemeColors = {
  primary: '#a855f7',
  accent: '#06b6d4',
  glow: 'rgba(168, 85, 247, 0.4)',
};

/** hex 色转带透明度的 rgba */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(168, 85, 247, ${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 读取当前全站主题色（CSS 变量），失败时回退默认紫色系 */
export function readThemeColors(): SceneThemeColors {
  if (typeof document === 'undefined') return DEFAULTS;

  const style = getComputedStyle(document.documentElement);
  const primary = style.getPropertyValue('--color-primary').trim() || DEFAULTS.primary;
  const accent = style.getPropertyValue('--color-accent').trim() || DEFAULTS.accent;
  return {
    primary,
    accent,
    glow: primary.startsWith('#') ? hexToRgba(primary, 0.4) : DEFAULTS.glow,
  };
}
