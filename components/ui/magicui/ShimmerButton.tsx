'use client';

/**
 * MagicUI 风格 - ShimmerButton（流光渐变按钮）
 * 边框流光 + 内部微光扫过，主题色驱动。项目自研实现，无外部依赖。
 */
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ShimmerButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

export function ShimmerButton({ children, onClick, className = '', disabled, type = 'button' }: ShimmerButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.04 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-8 py-4 text-base font-semibold text-white select-none disabled:opacity-60 ${className}`}
      style={{
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
        boxShadow: '0 8px 32px color-mix(in srgb, var(--color-primary) 45%, transparent)',
      }}
    >
      {/* 边框流光 */}
      <span
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-70 group-hover:opacity-100 transition-opacity"
        style={{
          background:
            'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.55) 50%, transparent 75%)',
          backgroundSize: '220% 100%',
          animation: 'shimmer 2.6s linear infinite',
          maskImage: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskImage: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          padding: 1.5,
        }}
      />
      {/* 表面高光扫过 */}
      <span
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background:
            'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)',
          backgroundSize: '220% 100%',
          animation: 'shimmer 1.8s linear infinite',
        }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
