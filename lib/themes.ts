/**
 * 站点主题注册表
 * 每套主题通过 <html data-theme="id" data-mode="dark|light"> 激活，
 * globals.css 中定义对应 CSS 变量；浅色主题另有全局工具类覆盖层。
 * 音频主题引擎（themeEngine）围绕当前主题色做音频驱动的调制。
 */

export type ThemeMode = 'dark' | 'light';

export interface SiteTheme {
  id: string;
  name: string;
  mode: ThemeMode;
  /** 主题主色 / 次色 / 点缀色（hex） */
  primary: string;
  secondary: string;
  accent: string;
  /** 页面底色（深色主题为深色基底，浅色主题为浅色基底） */
  bgBase: string;
  /** Hero Aurora 三段色 */
  aurora: [string, string, string];
  /** 快速明暗切换的配对主题 id */
  pairId: string;
}

export const THEMES: SiteTheme[] = [
  // ---- 深色 ----
  {
    id: 'nebula',
    name: '星云幻紫',
    mode: 'dark',
    primary: '#8b5cf6',
    secondary: '#d946ef',
    accent: '#22d3ee',
    bgBase: '#0a0a1a',
    aurora: ['#5227FF', '#a855f7', '#ec4899'],
    pairId: 'dawn',
  },
  {
    id: 'sunset',
    name: '落日汽水',
    mode: 'dark',
    primary: '#fb7185',
    secondary: '#fb923c',
    accent: '#fde047',
    bgBase: '#170d12',
    aurora: ['#f43f5e', '#fb923c', '#fbbf24'],
    pairId: 'peach',
  },
  {
    id: 'mint',
    name: '薄荷苏打',
    mode: 'dark',
    primary: '#2dd4bf',
    secondary: '#34d399',
    accent: '#a3e635',
    bgBase: '#071512',
    aurora: ['#14b8a6', '#34d399', '#a3e635'],
    pairId: 'matcha',
  },
  {
    id: 'blueberry',
    name: '蓝莓冰茶',
    mode: 'dark',
    primary: '#6366f1',
    secondary: '#3b82f6',
    accent: '#f472b6',
    bgBase: '#0a0e1f',
    aurora: ['#4f46e5', '#3b82f6', '#22d3ee'],
    pairId: 'lavender',
  },
  {
    id: 'sakura',
    name: '樱花物语',
    mode: 'dark',
    primary: '#f472b6',
    secondary: '#c084fc',
    accent: '#fb7185',
    bgBase: '#150b13',
    aurora: ['#ec4899', '#c084fc', '#fda4af'],
    pairId: 'skymint',
  },
  // ---- 浅色 ----
  {
    id: 'dawn',
    name: '晨雾蓝',
    mode: 'light',
    primary: '#4f6ef7',
    secondary: '#7c3aed',
    accent: '#0284c7',
    bgBase: '#f4f6fb',
    aurora: ['#bfdbfe', '#c4b5fd', '#a5f3fc'],
    pairId: 'nebula',
  },
  {
    id: 'peach',
    name: '蜜桃奶油',
    mode: 'light',
    primary: '#f472b6',
    secondary: '#fb923c',
    accent: '#e11d48',
    bgBase: '#fdf4f1',
    aurora: ['#fecdd3', '#fed7aa', '#fbcfe8'],
    pairId: 'sunset',
  },
  {
    id: 'matcha',
    name: '抹茶拿铁',
    mode: 'light',
    primary: '#10b981',
    secondary: '#65a30d',
    accent: '#0d9488',
    bgBase: '#f2f8f0',
    aurora: ['#a7f3d0', '#d9f99d', '#99f6e4'],
    pairId: 'mint',
  },
  {
    id: 'lavender',
    name: '薰衣草园',
    mode: 'light',
    primary: '#8b7cf6',
    secondary: '#a78bfa',
    accent: '#db2777',
    bgBase: '#f7f5fd',
    aurora: ['#ddd6fe', '#e9d5ff', '#fbcfe8'],
    pairId: 'blueberry',
  },
  {
    id: 'skymint',
    name: '晴空薄荷',
    mode: 'light',
    primary: '#06b6d4',
    secondary: '#0ea5e9',
    accent: '#14b8a6',
    bgBase: '#eefafc',
    aurora: ['#a5f3fc', '#bae6fd', '#99f6e4'],
    pairId: 'sakura',
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

/** 激活主题：设置 data-theme / data-mode 属性 + 更新 JS 侧缓存 */
export function applySiteTheme(id: string): void {
  activeTheme = getTheme(id);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = activeTheme.id;
    document.documentElement.dataset.mode = activeTheme.mode;
  }
}

/** hex → "r,g,b"（供 color-mix / rgba 使用） */
export function hexToRgbStr(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '139,92,246';
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
