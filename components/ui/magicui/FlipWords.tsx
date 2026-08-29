'use client';

/**
 * MagicUI 风格 - FlipWords（词语翻转轮播）
 * 副标题关键词逐个翻转，Anisotropic spring 出入场。
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface FlipWordsProps {
  words: string[];
  intervalMs?: number;
  className?: string;
}

export function FlipWords({ words, intervalMs = 2600, className = '' }: FlipWordsProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [words.length, intervalMs]);

  return (
    <span className={`inline-block relative overflow-hidden align-bottom ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ y: '100%', opacity: 0, filter: 'blur(6px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: '-100%', opacity: 0, filter: 'blur(6px)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="inline-block"
          style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
