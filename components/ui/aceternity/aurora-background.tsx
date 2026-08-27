'use client';
import { cn } from '@/lib/utils';
import React from 'react';

interface AuroraBackgroundProps {
  children: React.ReactNode;
  className?: string;
  radialGradient?: boolean;
}

export function AuroraBackground({
  children,
  className,
  radialGradient = true,
}: AuroraBackgroundProps) {
  return (
    <div className={cn('relative flex flex-col min-h-screen overflow-hidden', className)}>
      <div
        className={cn(
          'absolute inset-0 z-0 pointer-events-none',
          'animate-aurora',
          radialGradient && '[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]'
        )}
        style={{
          background:
            'repeating-linear-gradient(100deg, #6366f1 10%, #818cf8 15%, #a5b4fc 20%, #c4b5fd 25%, #818cf8 30%)',
          backgroundSize: '200% 200%',
          opacity: 0.4,
          filter: 'blur(40px)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
