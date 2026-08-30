/**
 * 空闲伪频谱 —— Canvas 场景的暂停态兜底动画源
 *
 * Canvas 2D 场景完全依赖真实频谱数据，暂停/静默时数据归零，
 * 画面会整体"冻死"（WebGL 粒子场景靠自身漂移没有此问题）。
 * 这里用双 sin 叠加的缓慢行波合成一段柔和伪频谱，仅在
 * 「未播放且能量近零」时替代真实数据，播放态不会被采到。
 */

/** 当前帧是否处于空闲（应使用伪频谱兜底） */
export function isIdleFrame(frame: { isPlaying: boolean; energy: number }): boolean {
  return !frame.isPlaying && frame.energy < 0.02;
}

/**
 * 位置 x∈[0,1] 在时间 t（秒）处的伪频谱幅度（0 ~ 0.35）
 * 行波 + 慢呼吸调制产生非循环观感；低频端整体更高，接近真实频谱的视觉分布
 */
export function idleSpectrumAt(x: number, t: number): number {
  const wave = 0.55 + 0.45 * Math.sin(x * Math.PI * 4 - t * 1.6) * Math.sin(t * 0.6 + x * 5);
  const tilt = 1 - x * 0.5;
  return Math.max(0, wave * tilt) * 0.35;
}
