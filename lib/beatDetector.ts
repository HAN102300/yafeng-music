/**
 * 节拍检测器
 * 提供高级节拍检测和 BPM 估算
 * - 能量历史用环形缓冲（固定数组 + 写指针），避免每帧 shift() 的 O(n)
 * - BeatState 复用单个对象，process 原地更新，避免高频 GC 压力
 */

export interface BeatState {
  isBeat: boolean;
  bpm: number;
  confidence: number;
}

export class BeatDetector {
  // 环形缓冲：~1秒 at 60fps
  private readonly historySize = 43;
  private energyHistory: number[] = new Array(this.historySize).fill(0);
  private historyCount = 0;
  private historyIndex = 0;

  // 节拍时间环形缓冲（最近 8 个）
  private readonly beatCapacity = 8;
  private beatTimes: number[] = new Array(this.beatCapacity).fill(0);
  private beatCount = 0;
  private beatIndex = 0;

  private lastBeatTime = 0;
  private estimatedBPM = 120;
  private readonly minBPM = 60;
  private readonly maxBPM = 200;

  // 复用的返回值对象
  private readonly state: BeatState = { isBeat: false, bpm: 120, confidence: 0 };

  /**
   * 处理新的能量值（原地更新并返回复用对象）
   */
  process(energy: number): BeatState {
    const now = Date.now();

    // 环形写入能量历史
    this.energyHistory[this.historyIndex] = energy;
    this.historyIndex = (this.historyIndex + 1) % this.historySize;
    if (this.historyCount < this.historySize) this.historyCount++;

    // 计算统计值（遍历已填充部分）
    const n = this.historyCount;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += this.energyHistory[i];
    const avg = sum / n;

    let variance = 0;
    for (let i = 0; i < n; i++) {
      const d = this.energyHistory[i] - avg;
      variance += d * d;
    }
    variance /= n;

    const threshold = avg * (1.3 + variance * 2);

    // 检测节拍
    let isBeat = false;
    const minInterval = 60000 / this.maxBPM;

    if (energy > threshold && energy > 0.1 && now - this.lastBeatTime > minInterval) {
      isBeat = true;
      this.lastBeatTime = now;

      this.beatTimes[this.beatIndex] = now;
      this.beatIndex = (this.beatIndex + 1) % this.beatCapacity;
      if (this.beatCount < this.beatCapacity) this.beatCount++;

      this.estimateBPM();
    }

    this.state.isBeat = isBeat;
    this.state.bpm = Math.round(this.estimatedBPM);
    this.state.confidence = this.calculateConfidence();
    return this.state;
  }

  /** 按写入顺序返回最近的节拍时间戳 */
  private recentBeatTimes(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.beatCount; i++) {
      const idx = (this.beatIndex - this.beatCount + i + this.beatCapacity * 2) % this.beatCapacity;
      out.push(this.beatTimes[idx]);
    }
    return out;
  }

  private estimateBPM(): void {
    if (this.beatCount < 2) return;

    const times = this.recentBeatTimes();
    let intervalSum = 0;
    for (let i = 1; i < times.length; i++) intervalSum += times[i] - times[i - 1];
    const avgInterval = intervalSum / (times.length - 1);
    const bpm = 60000 / avgInterval;

    if (bpm >= this.minBPM && bpm <= this.maxBPM) {
      this.estimatedBPM = this.estimatedBPM * 0.8 + bpm * 0.2;
    }
  }

  private calculateConfidence(): number {
    if (this.beatCount < 4) return 0;

    const times = this.recentBeatTimes();
    let intervalSum = 0;
    for (let i = 1; i < times.length; i++) intervalSum += times[i] - times[i - 1];
    const avg = intervalSum / (times.length - 1);

    let variance = 0;
    for (let i = 1; i < times.length; i++) {
      const d = times[i] - times[i - 1] - avg;
      variance += d * d;
    }
    variance /= times.length - 1;
    const stdDev = Math.sqrt(variance);

    return Math.max(0, 1 - stdDev / avg);
  }
}

// 单例导出
export const beatDetector = new BeatDetector();
