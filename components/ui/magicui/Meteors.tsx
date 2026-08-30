'use client';

/**
 * MagicUI 风格 - Meteors（流星雨）
 * 纯 CSS 动画流星，颜色随主题。用于 Hero 背景点缀。
 * keyframes 定义在 globals.css（meteor-fall）。
 * 注意：随机位置仅在客户端挂载后生成（Math.random SSR/客户端不一致会导致水合错误）。
 */
import { useEffect, useState } from 'react';

interface MeteorsProps {
  number?: number;
  className?: string;
}

interface MeteorSpec {
  id: number;
  left: number;
  top: number;
  delay: number;
  duration: number;
}

export function Meteors({ number = 14, className = '' }: MeteorsProps) {
  const [meteors, setMeteors] = useState<MeteorSpec[]>([]);

  useEffect(() => {
    setMeteors(
      Array.from({ length: number }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 35,
        delay: Math.random() * 6,
        duration: 3 + Math.random() * 4,
      }))
    );
  }, [number]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {meteors.map((m) => (
        <span
          key={m.id}
          className="absolute"
          style={{
            left: `${m.left}%`,
            top: `${m.top}%`,
            animation: `meteor-fall ${m.duration}s linear infinite`,
            animationDelay: `${m.delay}s`,
          }}
        >
          <span
            className="block h-px w-[90px] rotate-[215deg]"
            style={{
              background: 'linear-gradient(90deg, var(--color-accent), transparent)',
              boxShadow: '0 0 6px 1px color-mix(in srgb, var(--color-accent) 60%, transparent)',
            }}
          />
        </span>
      ))}
    </div>
  );
}
