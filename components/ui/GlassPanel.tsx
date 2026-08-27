'use client';

/**
 * 玻璃拟态面板组件
 * 提供半透明毛玻璃效果的基础容器
 */
import { ReactNode } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'primary' | 'accent' | 'pink' | 'none';
  onClick?: () => void;
}

export default function GlassPanel({
  children,
  className = '',
  hover = true,
  glow = 'none',
  onClick,
}: GlassPanelProps) {
  const glowClass = {
    primary: 'hover:shadow-glow',
    accent: 'hover:shadow-glow',
    pink: 'hover:shadow-glow-pink',
    none: '',
  }[glow];

  return (
    <div
      className={`
        glass-panel
        ${hover ? 'cursor-pointer' : ''}
        ${glowClass}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
