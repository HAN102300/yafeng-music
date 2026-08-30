'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlowingButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function GlowingButton({
  children,
  className,
  onClick,
  variant = 'primary',
  size = 'md',
}: GlowingButtonProps) {
  const baseStyles = 'relative inline-flex items-center justify-center font-medium transition-all duration-300 rounded-full overflow-hidden';
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };
  const variantStyles = {
    primary: 'bg-gradient-primary text-white on-accent shadow-lg hover:brightness-110',
    secondary: 'bg-white/10 text-white backdrop-blur-sm border border-white/20 hover:bg-white/20',
    outline: 'border-2 border-violet-500 text-violet-400 hover:bg-violet-500/10',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
    >
      <motion.div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 70%)',
        }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
