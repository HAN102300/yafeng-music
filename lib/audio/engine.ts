/**
 * 全局音频引擎 - 全站唯一音源
 *
 * 模块级单例：持有唯一的 HTMLAudioElement（代码创建，不放 JSX）、
 * 唯一的 AudioContext + AnalyserNode。
 * - createMediaElementSource 有"一元素仅一次"的硬限制，用 connected 守卫保证幂等
 *   （防 StrictMode / 热重载双挂载抛错）
 * - 生命周期与应用一致，没有消费者侧 destroy
 * - 帧数据缓冲区预分配复用，captureFrame 零堆分配
 */
import { beatDetector, BeatState } from '@/lib/beatDetector';

export interface FrameData {
  /** 频率数据 (0-255)，共享缓冲区，勿持有引用跨帧使用 */
  frequencyData: Uint8Array;
  bass: number;
  mid: number;
  treble: number;
  energy: number;
  beat: BeatState;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

const EMPTY_BEAT: BeatState = { isBeat: false, bpm: 120, confidence: 0 };

class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private connected = false;

  // 预分配缓冲区（fftSize 256 → frequencyBinCount 128）
  private freqBuffer = new Uint8Array(128);

  // 复用的帧对象，captureFrame 原地更新
  private frame: FrameData = {
    frequencyData: this.freqBuffer,
    bass: 0,
    mid: 0,
    treble: 0,
    energy: 0,
    beat: EMPTY_BEAT,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
  };

  /** 获取唯一音频元素（SSR 环境返回 null） */
  getAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'metadata';
      this.audio.crossOrigin = 'anonymous';
    }
    return this.audio;
  }

  /**
   * 建立 Web Audio 分析链（幂等）
   * 应在用户播放手势的调用链中触发
   */
  ensureContext(): void {
    const audio = this.getAudio();
    if (!audio) return;

    if (!this.ctx) {
      const Ctor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.analyser = this.ctx!.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
    }

    // 已连接守卫：createMediaElementSource 对同一元素只能调用一次
    if (!this.connected && this.ctx && this.analyser) {
      const source = this.ctx.createMediaElementSource(audio);
      source.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.connected = true;
    }
  }

  /** 恢复音频上下文（浏览器自动播放策略） */
  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * 倍速是否可安全应用
   * 经 Web Audio MediaElementSource 输出的音频，部分内核（Chromium 旧版 /
   * iOS WebKit）在高倍速下会出现破音、变速失真；分析链建立后限制在实测
   * 稳定的 0.5x~1.5x 区间。未接入分析链时走浏览器原生路径，任意倍速都稳定。
   */
  isRateSafe(rate: number): boolean {
    if (!this.ctx || !this.connected) return true;
    return rate >= 0.5 && rate <= 1.5;
  }

  /** 跳转播放位置（秒） */
  seek(time: number): void {
    if (this.audio && isFinite(time)) {
      this.audio.currentTime = Math.max(0, time);
    }
  }

  /**
   * 从头重播并确保继续播放
   * 供「切歌」实际选中当前曲时调用（单曲队列循环）：id 不变不会触发
   * 引擎重载 effect，必须由调用方显式重置进度并恢复播放。
   */
  restart(): void {
    if (!this.audio) return;
    this.audio.currentTime = 0;
    if (this.audio.paused) void this.audio.play().catch(() => {});
  }

  /**
   * 捕获当前帧的分析数据（由帧调度器每帧调用一次）
   * 未初始化时输出静默数据，不报错
   */
  captureFrame(): FrameData {
    const frame = this.frame;
    const audio = this.audio;

    frame.currentTime = audio?.currentTime ?? 0;
    frame.duration = audio && isFinite(audio.duration) ? audio.duration : 0;
    frame.isPlaying = !!audio && !audio.paused;

    if (!this.analyser) {
      frame.bass = frame.mid = frame.treble = frame.energy = 0;
      frame.beat = EMPTY_BEAT;
      return frame;
    }

    this.analyser.getByteFrequencyData(this.freqBuffer as Uint8Array<ArrayBuffer>);

    // 三频段能量
    const data = this.freqBuffer;
    const len = data.length;
    const bassEnd = Math.floor(len * 0.15);
    const midEnd = Math.floor(len * 0.5);
    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;
    for (let i = 0; i < len; i++) {
      if (i < bassEnd) bassSum += data[i];
      else if (i < midEnd) midSum += data[i];
      else trebleSum += data[i];
    }
    frame.bass = bassSum / bassEnd / 255;
    frame.mid = midSum / (midEnd - bassEnd) / 255;
    frame.treble = trebleSum / (len - midEnd) / 255;
    frame.energy = (frame.bass + frame.mid + frame.treble) / 3;

    // 节拍检测（BPM / 相位 / 置信度）
    frame.beat = beatDetector.process(frame.energy);

    return frame;
  }
}

// 单例导出
export const audioEngine = new AudioEngine();

// 调试/诊断钩子：控制台可直接检查音频元素状态（无副作用）
if (typeof window !== 'undefined') {
  (window as unknown as { __AUDIO_ENGINE__: AudioEngine }).__AUDIO_ENGINE__ = audioEngine;
}
