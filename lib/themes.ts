/**
 * 站点主题注册表
 * 每套主题通过 <html data-theme="id"> 激活，globals.css 中定义对应 CSS 变量。
 * 音频主题引擎（themeEngine）围绕当前主题色做音频驱动的调制。
 */

export interface SiteTheme {
  id: string;
  name: string;
  /** 主题主色 / 次色 / 点缀色（hex） */
  primary: string;
  secondary: string;
  accent: string;
  /** 页面底色（深色基底） */
  bgBase: string;
  /** Hero Aurora 三段色 */
  aurora: [string, string, string];
}

export const THEMES: SiteTheme[] = [
  {
    id: 'nebula',
    name: '星云幻紫',
    primary: '#8b5cf6',
    secondary: '#d946ef',
    accent: '#22d3ee',
    bgBase: '#0a0a1a',
    aurora: ['#5227FF', '#a855f7', '#ec4899'],
  },
  {
    id: 'sunset',
    name: '落日汽水',
    primary: '#fb7185',
    secondary: '#fb923c',
    accent: '#fde047',
    bgBase: '#170d12',
    aurora: ['#f43f5e', '#fb923c', '#fbbf24'],
  },
  {
    id: 'mint',
    name: '薄荷苏打',
    primary: '#2dd4bf',
    secondary: '#34d399',
    accent: '#a3e635',
    bgBase: '#071512',
    aurora: ['#14b8a6', '#34d399', '#a3e635'],
  },
  {
    id: 'blueberry',
    name: '蓝莓冰茶',
    primary: '#6366f1',
    secondary: '#3b82f6',
    accent: '#f472b6',
    bgBase: '#0a0e1f',
    aurora: ['#4f46e5', '#3b82f6', '#22d3ee'],
  },
  {
    id: 'sakura',
    name: '樱花物语',
    primary: '#f472b6',
    secondary: '#c084fc',
    accent: '#fb7185',
    bgBase: '#150b13',
    aurora: ['#ec4899', '#c084fc', '#fda4af'],
  },
];

export const DEFAULT_THEME_ID = 'nebula';

export function getTheme(id: string): SiteTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

// 当前激活主题（JS 侧缓存，供音频主题引擎逐帧读取，避免触 DOM）
let activeTheme: SiteTheme = getTheme(DEFAULT_THEME_ID);

export function getActiveTheme(): SiteTheme {
  return activeTheme;
}

/** 激活主题：设置 data-theme 属性 + 更新 JS 侧缓存（CSS 变量由 [data-theme] 规则提供） */
export function applySiteTheme(id: string): void {
  activeTheme = getTheme(id);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = activeTheme.id;
  }
}

/** hex → "r,g,b"（供 color-mix / rgba 使用） */
export function hexToRgbStr(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '139,92,246';
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
