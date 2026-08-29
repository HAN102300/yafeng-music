'use client';

/**
 * MagicUI 风格 - BorderBeam（边框流光）
 * 沿容器边框循环流动的光束，主题色驱动。绝对定位于 relative 父容器。
 */
interface BorderBeamProps {
  size?: number;
  duration?: number;
  className?: string;
}

export function BorderBeam({ size = 120, duration = 6, className = '' }: BorderBeamProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden ${className}`}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          padding: 1.5,
          maskImage: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskImage: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: size,
            height: size,
            background:
              'conic-gradient(from 0deg, transparent 0%, var(--color-accent) 12%, var(--color-primary) 22%, transparent 34%)',
            animation: `border-beam-spin ${duration}s linear infinite`,
            filter: 'blur(1px)',
          }}
        />
      </div>
      <style>{`@keyframes border-beam-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
