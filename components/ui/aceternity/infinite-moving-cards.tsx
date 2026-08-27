'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface InfiniteMovingCardsProps {
  items: React.ReactNode[];
  direction?: 'left' | 'right';
  speed?: 'fast' | 'normal' | 'slow';
  pauseOnHover?: boolean;
  className?: string;
}

export function InfiniteMovingCards({
  items,
  direction = 'left',
  speed = 'normal',
  pauseOnHover = true,
  className,
}: InfiniteMovingCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    setStart(true);
  }, []);

  const speedMap = { fast: 20, normal: 35, slow: 50 };
  const duration = speedMap[speed];

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]',
        className
      )}
    >
      <motion.div
        className="flex gap-4 shrink-0"
        animate={{
          x: direction === 'left' ? ['0%', '-50%'] : ['-50%', '0%'],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {[...items, ...items].map((item, idx) => (
          <div key={idx} className={cn(pauseOnHover && 'group')}>
            {item}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
