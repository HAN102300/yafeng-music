'use client';

/**
 * React Bits - SplitText（文字逐字入场）
 * 来源: reactbits.dev，按项目规范适配：
 * 原版依赖 gsap/SplitText 付费插件，此处以 framer-motion 等效实现，视觉一致
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;       // 每字符间隔 ms
  duration?: number;    // 单字符动画时长 s
  splitType?: 'chars' | 'words';
  from?: { opacity?: number; y?: number };
  to?: { opacity?: number; y?: number };
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
  textAlign?: React.CSSProperties['textAlign'];
  onLetterAnimationComplete?: () => void;
}

const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = '',
  delay = 50,
  duration = 0.8,
  splitType = 'chars',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  tag = 'p',
  textAlign = 'center',
  onLetterAnimationComplete,
}) => {
  const segments = useMemo(
    () => (splitType === 'words' ? text.split(' ') : Array.from(text)),
    [text, splitType]
  );

  const Tag: React.ElementType = tag;

  return (
    <Tag
      className={`inline-block overflow-hidden whitespace-normal ${className}`}
      style={{ textAlign, wordWrap: 'break-word' }}
    >
      {segments.map((segment, index) => (
        <motion.span
          key={`${segment}-${index}`}
          initial={from}
          animate={to}
          transition={{
            duration,
            ease: [0.215, 0.61, 0.355, 1],
            delay: (index * delay) / 1000,
          }}
          onAnimationComplete={
            index === segments.length - 1 ? onLetterAnimationComplete : undefined
          }
          className="inline-block will-change-transform"
        >
          {segment === ' ' ? '\u00A0' : segment}
          {splitType === 'words' && index < segments.length - 1 && '\u00A0'}
        </motion.span>
      ))}
    </Tag>
  );
};

export default SplitText;
