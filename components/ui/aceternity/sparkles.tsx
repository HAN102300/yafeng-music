'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SparklesProps {
  className?: string;
  density?: number;
  speed?: number;
  color?: string;
  opacity?: number;
  size?: { min: number; max: number };
}

interface Particle {
  id: number;
  x: number;
  y: number;
  s: number;
  delay: number;
  duration: number;
}

export function Sparkles({
  className,
  density = 80,
  speed = 2,
  color = '#ffffff',
  opacity = 0.7,
  size = { min: 1, max: 3 },
}: SparklesProps) {
  // 粒子含随机值，仅在客户端挂载后生成，避免 SSR hydration 不一致
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: density }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: size.min + Math.random() * (size.max - size.min),
        delay: Math.random() * 5,
        duration: speed + Math.random() * 3,
      }))
    );
  }, [density, speed, size.min, size.max]);

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.s,
            height: p.s,
            backgroundColor: color,
          }}
          animate={{
            opacity: [0, opacity, 0],
            scale: [0.5, 1.2, 0.5],
            y: [0, -30, -60],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
