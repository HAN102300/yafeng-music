'use client';

/**
 * MobileAudioUnlock - iOS Safari 静默解锁
 *
 * iOS Safari 的自动播放策略：AudioContext 初始为 suspended，且 <audio> 的
 * play() 必须发生在用户手势调用栈内，否则被静默拒绝（表现为点播放无声）。
 * 传统方案要求首次点击时手动 play 再 pause 一个空音频；iOS ≥ 6.1 起支持
 * audio.load() 作为解锁手势（无需出声），这里用它做零噪音解锁：
 * - 首次 pointerdown/touchend/keydown 时对引擎 audio 执行 load()
 * - 同时 ensureContext() 建立分析链并 resume（可视化保真）
 * - 解锁完成后移除全部监听，只执行一次
 * Android Chrome / 桌面浏览器执行同样序列无副作用（幂等），统一启用。
 */
import { useEffect } from 'react';
import { audioEngine } from '@/lib/audio/engine';

export function MobileAudioUnlock() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let unlocked = false;

    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      try {
        const audio = audioEngine.getAudio();
        if (audio) audio.load(); // iOS 手势内 load 即解锁后续 play()
        audioEngine.ensureContext();
        void audioEngine.resume();
      } catch {
        /* 解锁失败不打扰用户，正常播放流程会再走 ensureContext/resume */
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchend', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchend', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchend', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return null;
}
