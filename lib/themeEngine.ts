/**
 * 自适应主题引擎（主题感知版）
 * 根据音频特征在「当前站点主题色」基础上动态调制颜色，
 * 保证音频驱动变色与用户选择的主题风格一致。
 */
import { getActiveTheme } from './themes';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
}

export interface ThemeState {
  colors: ThemeColors;
  intensity: number;    // 发光强度 0-1
  speed: number;        // 动画速度 0-1
}

// 频段倾向色（与主题色混合，制造"音乐改变氛围"的感觉）
const BAND_TINTS = {
  warm: '#ff6b6b',
  cool: '#22d3ee',
};

/**
 * 根据音频数据在当前主题色基础上计算调制后的主题
 */
export function calculateTheme(
  bass: number,
  mid: number,
  treble: number,
  energy: number
): ThemeState {
  const active = getActiveTheme();

  // 根据能量调整强度
  const intensity = Math.min(energy * 1.5, 1);
  const speed = Math.min(energy * 2, 1);

  // 各频段比例 → 向暖/冷倾向色小幅偏移（最多 35%），保持主题基调
  const total = bass + mid + treble || 1;
  const bassRatio = bass / total;
  const trebleRatio = treble / total;

  const colors: ThemeColors = {
    primary: blendColors(active.primary, BAND_TINTS.warm, bassRatio * 0.35),
    secondary: blendColors(active.secondary, active.accent, mid * 0.25),
    accent: blendColors(active.accent, BAND_TINTS.cool, trebleRatio * 0.3),
    glow: withAlpha(active.primary, 0.4 + intensity * 0.2),
  };

  return { colors, intensity, speed };
}

/** hex → "r,g,b" */
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [139, 92, 246];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * 混合两个颜色
 */
function blendColors(color1: string, color2: string, ratio: number): string {
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

/**
 * 将主题应用到 CSS 变量
 */
export function applyThemeToDOM(theme: ThemeState): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.colors.primary);
  root.style.setProperty('--color-primary-light', theme.colors.secondary);
  root.style.setProperty('--color-accent', theme.colors.accent);
  root.style.setProperty('--glow-primary', `0 0 ${20 + theme.intensity * 30}px ${theme.colors.glow}`);
}
