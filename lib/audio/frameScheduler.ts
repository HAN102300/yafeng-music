/**
 * 帧调度器 - 全站唯一 rAF 循环
 *
 * 订阅制驱动所有帧数据消费者（可视化绘制、节拍脉冲、主题、歌词同步）。
 * - FrameData 为共享可变对象，回调内直接读取，绝不进 React state
 * - 零订阅者或页面不可见时自动停摆
 * - 播放态 60fps；暂停（静默）时自适应降频到 ~10fps，避免空转
 */
import { audioEngine, FrameData } from './engine';

export type FrameCallback = (frame: FrameData) => void;

const subscribers = new Set<FrameCallback>();
let rafId = 0;
let timerId: ReturnType<typeof setTimeout> | null = null;
let running = false;
let visibilityBound = false;
let silentFrames = 0;
let lastMode: 'raf' | 'timer' = 'raf';

const SILENT_THRESHOLD = 120; // 连续静默帧数（约 2 秒）后降频
const TIMER_INTERVAL = 100; // 降频间隔 100ms (~10fps)

function dispatch() {
  const frame = audioEngine.captureFrame();
  subscribers.forEach((cb) => {
    try {
      cb(frame);
    } catch (err) {
      console.error('[frameScheduler] subscriber error:', err);
    }
  });

  // 静默检测：暂停且能量极低视为静默
  const silent = !frame.isPlaying && frame.energy < 0.02;
  silentFrames = silent ? silentFrames + 1 : 0;

  const wantTimer = silentFrames >= SILENT_THRESHOLD;
  if (wantTimer && lastMode !== 'timer') {
    lastMode = 'timer';
    cancelAnimationFrame(rafId);
    rafId = 0;
    timerId = setTimeout(tick, TIMER_INTERVAL);
  } else if (!wantTimer && lastMode !== 'raf') {
    lastMode = 'raf';
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    rafId = requestAnimationFrame(tick);
  }
}

function tick() {
  if (!running) return;
  dispatch();
  if (lastMode === 'raf') {
    rafId = requestAnimationFrame(tick);
  } else {
    timerId = setTimeout(tick, TIMER_INTERVAL);
  }
}

function start() {
  if (running || typeof window === 'undefined') return;
  running = true;
  lastMode = 'raf';
  rafId = requestAnimationFrame(tick);
}

function stop() {
  if (!running) return;
  running = false;
  silentFrames = 0;
  cancelAnimationFrame(rafId);
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
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
  if (typeof document !== 'undefined' && !document.hidden) start();

  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) stop();
  };
}
