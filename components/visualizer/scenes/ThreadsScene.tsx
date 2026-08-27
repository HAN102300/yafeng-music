'use client';

/**
 * 丝弦场景 - React Bits Threads(ogl) 适配层
 * Threads 通过 propsRef 读取 amplitude（不重建 context），
 * 此处以 ~8fps 节流将 energy 映射为 amplitude。
 */
import { useRef, useState } from 'react';
import Threads from '@/components/ui/reactbits/Threads';
import { useAudioFrame } from '@/hooks/useAudioFrame';

export default function ThreadsScene() {
  const [amplitude, setAmplitude] = useState(1);
  const lastUpdateRef = useRef(0);

  useAudioFrame((frame) => {
    const now = performance.now();
    if (now - lastUpdateRef.current < 125) return;
    lastUpdateRef.current = now;
    setAmplitude(0.6 + frame.energy * 3);
  });

  return (
    <div className="absolute inset-0">
      <Threads color={[0.66, 0.33, 0.97]} amplitude={amplitude} distance={0.3} enableMouseInteraction />
    </div>
  );
}
