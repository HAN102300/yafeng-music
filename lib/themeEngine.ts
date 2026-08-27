/**
 * 自适应主题引擎
 * 根据音频特征动态计算主题颜色
 */

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  glow: string;
}

export interface ThemeState {
  colors: ThemeColors;
  intensity: number;    // 发光强度 0-1
  speed: number;        // 动画速度 0-1
}

// 预定义主题色板
const THEME_PALETTES = {
  // 低频主导 - 暖色调
  warm: {
    primary: '#ff6b6b',
    secondary: '#ee5a24',
    accent: '#feca57',
    background: 'linear-gradient(135deg, #1a0a0a 0%, #2d1b1b 50%, #4a1a1a 100%)',
    glow: 'rgba(255, 107, 107, 0.4)',
  },
  // 中频主导 - 紫色调
  purple: {
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#f093fb',
    background: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b4e 100%)',
    glow: 'rgba(102, 126, 234, 0.4)',
  },
  // 高频主导 - 冷色调
  cool: {
    primary: '#00d9f5',
    secondary: '#00f5a0',
    accent: '#00d9f5',
    background: 'linear-gradient(135deg, #0a1a1a 0%, #1a2d2d 50%, #0a3a3a 100%)',
    glow: 'rgba(0, 217, 245, 0.4)',
  },
  // 均衡 - 粉紫色调
  balanced: {
    primary: '#a855f7',
    secondary: '#ec4899',
    accent: '#06b6d4',
    background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a1a3e 100%)',
    glow: 'rgba(168, 85, 247, 0.4)',
  },
};

/**
 * 根据音频数据计算主题
 */
export function calculateTheme(
  bass: number,
  mid: number,
  treble: number,
  energy: number
): ThemeState {
  // 确定主导频段
  const maxBand = Math.max(bass, mid, treble);
  
  let basePalette: ThemeColors;
  
  if (maxBand === bass && bass > 0.3) {
    basePalette = THEME_PALETTES.warm;
  } else if (maxBand === treble && treble > 0.3) {
    basePalette = THEME_PALETTES.cool;
  } else if (maxBand === mid && mid > 0.3) {
    basePalette = THEME_PALETTES.purple;
  } else {
    basePalette = THEME_PALETTES.balanced;
  }

  // 根据能量调整强度
  const intensity = Math.min(energy * 1.5, 1);
  const speed = Math.min(energy * 2, 1);

  // 混合颜色（根据各频段比例）
  const total = bass + mid + treble || 1;
  const bassRatio = bass / total;
  const trebleRatio = treble / total;

  const colors: ThemeColors = {
    primary: blendColors(basePalette.primary, THEME_PALETTES.warm.primary, bassRatio * 0.3),
    secondary: blendColors(basePalette.secondary, THEME_PALETTES.cool.secondary, trebleRatio * 0.3),
    accent: basePalette.accent,
    background: basePalette.background,
    glow: basePalette.glow,
  };

  return { colors, intensity, speed };
}

/**
 * 混合两个颜色
 */
function blendColors(color1: string, color2: string, ratio: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
