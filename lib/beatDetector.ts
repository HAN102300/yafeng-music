/**
 * 节拍检测器
 * 提供高级节拍检测和 BPM 估算
 */

export interface BeatState {
  isBeat: boolean;
  bpm: number;
  confidence: number;
  phase: number;
}

export class BeatDetector {
  private energyHistory: number[] = [];
  private beatTimes: number[] = [];
  private lastBeatTime = 0;
  private estimatedBPM = 120;
  private beatPhase = 0;
  private readonly historySize = 43; // ~1秒 at 60fps
  private readonly minBPM = 60;
  private readonly maxBPM = 200;

  /**
   * 处理新的能量值
   */
  process(energy: number): BeatState {
    const now = Date.now();
    
    // 更新能量历史
    this.energyHistory.push(energy);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }

    // 计算统计值
    const avg = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const variance = this.energyHistory.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / this.energyHistory.length;
    const threshold = avg * (1.3 + variance * 2);

    // 检测节拍
    let isBeat = false;
    const minInterval = 60000 / this.maxBPM; // 最小节拍间隔
    
    if (energy > threshold && energy > 0.1 && (now - this.lastBeatTime) > minInterval) {
      isBeat = true;
      this.lastBeatTime = now;
      this.beatTimes.push(now);
      
      // 保持最近 8 个节拍
      if (this.beatTimes.length > 8) {
        this.beatTimes.shift();
      }
      
      // 估算 BPM
      this.estimateBPM();
    }

    // 更新相位
    this.updatePhase(now);

    return {
      isBeat,
      bpm: Math.round(this.estimatedBPM),
      confidence: this.calculateConfidence(),
      phase: this.beatPhase,
    };
  }

  /**
   * 估算 BPM
   */
  private estimateBPM(): void {
    if (this.beatTimes.length < 2) return;

    const intervals: number[] = [];
    for (let i = 1; i < this.beatTimes.length; i++) {
      intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = 60000 / avgInterval;

    if (bpm >= this.minBPM && bpm <= this.maxBPM) {
      // 平滑 BPM 变化
      this.estimatedBPM = this.estimatedBPM * 0.8 + bpm * 0.2;
    }
  }

  /**
   * 更新节拍相位
   */
  private updatePhase(now: number): void {
    const beatInterval = 60000 / this.estimatedBPM;
    const timeSinceLastBeat = now - this.lastBeatTime;
    this.beatPhase = (timeSinceLastBeat % beatInterval) / beatInterval;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(): number {
    if (this.beatTimes.length < 4) return 0;
    
    const intervals: number[] = [];
    for (let i = 1; i < this.beatTimes.length; i++) {
      intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
    }

    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // 标准差越小，置信度越高
    return Math.max(0, 1 - stdDev / avg);
  }

  /**
   * 重置检测器
   */
  reset(): void {
    this.energyHistory = [];
    this.beatTimes = [];
    this.lastBeatTime = 0;
    this.estimatedBPM = 120;
    this.beatPhase = 0;
  }
}

// 单例导出
export const beatDetector = new BeatDetector();
