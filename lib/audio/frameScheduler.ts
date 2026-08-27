/**
 * 帧调度器 - 全站唯一 rAF 循环
 *
 * 订阅制驱动所有帧数据消费者（可视化绘制、节拍脉冲、主题、歌词同步）。
 * - FrameData 为共享可变对象，回调内直接读取，绝不进 React state
 * - 零订阅者或页面不可见时自动停摆
 */
import { audioEngine, FrameData } from './engine';

export type FrameCallback = (frame: FrameData) => void;

const subscribers = new Set<FrameCallback>();
let rafId = 0;
let running = false;
let visibilityBound = false;

function tick() {
  const frame = audioEngine.captureFrame();
  subscribers.forEach((cb) => {
    try {
      cb(frame);
    } catch (err) {
      console.error('[frameScheduler] subscriber error:', err);
    }
  });
  rafId = requestAnimationFrame(tick);
}

function start() {
  if (running || typeof window === 'undefined') return;
  running = true;
  rafId = requestAnimationFrame(tick);
}

function stop() {
  if (!running) return;
  running = false;
  cancelAnimationFrame(rafId);
}

function handleVisibility() {
  if (document.hidden) {
    stop();
  } else if (subscribers.size > 0) {
    start();
  }
}

/**
 * 订阅每帧音频数据，返回取消订阅函数
 */
export function subscribeFrame(callback: FrameCallback): () => void {
  if (typeof window !== 'undefined' && !visibilityBound) {
    visibilityBound = true;
    document.addEventListener('visibilitychange', handleVisibility);
  }

  subscribers.add(callback);
  if (!document?.hidden) start();

  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) stop();
  };
}
