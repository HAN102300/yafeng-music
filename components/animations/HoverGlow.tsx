'use client';

/**
 * 悬停发光组件
 * 鼠标悬停时产生发光效果
 */
import { useState, useRef, ReactNode } from 'react';

interface HoverGlowProps {
  children: ReactNode;
  color?: string;
  intensity?: number;
  className?: string;
}

export default function HoverGlow({
  children,
  color = '#667eea',
  intensity = 20,
  className = '',
}: HoverGlowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
    >
      {/* 发光层 */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(${intensity}px circle at ${position.x}px ${position.y}px, ${color}33, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}
