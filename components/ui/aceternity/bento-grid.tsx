'use client';
import React from 'react';
import { cn } from '@/lib/utils';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid w-full auto-rows-[18rem] grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
        className
      )}
    >
      {children}
    </div>
  );
}

export function BentoCard({
  children,
  className,
  title,
  description,
  icon,
}: BentoCardProps) {
  return (
    <div
      className={cn(
        'group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-2xl',
        'bg-white/5 backdrop-blur-sm border border-white/10',
        'transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07]',
        className
      )}
    >
      <div className="flex flex-col gap-2 p-6">
        {icon && <div className="text-2xl">{icon}</div>}
        {title && <h3 className="font-semibold text-lg text-white">{title}</h3>}
        {description && <p className="text-sm text-white/60">{description}</p>}
      </div>
      <div className="p-6 pt-0">{children}</div>
    </div>
  );
}
