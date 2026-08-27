'use client';

/**
 * useAudioFrame - 拉取式帧数据订阅 Hook
 *
 * 替代旧的 useRealtimeAnalysis / useBeatSync / useAdaptiveTheme 三条独立 rAF：
 * 回调在全站唯一 rAF 循环内被调用，直接读共享 FrameData 做命令式绘制/更新，
 * 组件本身 0 重渲染。低频值（BPM、主题色）请在回调内自行节流后再进 React state。
 */
import { useEffect, useRef } from 'react';
import { subscribeFrame } from '@/lib/audio/frameScheduler';
import type { FrameData } from '@/lib/audio/engine';

export type { FrameData };

export function useAudioFrame(callback: (frame: FrameData) => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    return subscribeFrame((frame) => callbackRef.current(frame));
  }, []);
}
