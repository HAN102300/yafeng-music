'use client';

/**
 * React Bits - ChromaGrid（跟随光标去灰阶网格）
 * 来源: reactbits.dev (ts-tailwind)，按项目规范适配：
 * 移除演示数据，onItemClick 取代 url 跳转（用于歌手墙点击播放）；
 * 光标跟随用 rAF lerp + CSS transition 实现（原 gsap 依赖已移除）
 */
import React, { useRef, useEffect } from 'react';

export interface ChromaItem {
  image: string;
  title: string;
  subtitle: string;
  handle?: string;
  borderColor?: string;
  gradient?: string;
}

export interface ChromaGridProps {
  items: ChromaItem[];
  onItemClick?: (item: ChromaItem, index: number) => void;
  className?: string;
  /** 光标探照半径（px） */
  radius?: number;
}

const ChromaGrid: React.FC<ChromaGridProps> = ({
  items,
  onItemClick,
  className = '',
  radius = 300
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);

  // rAF lerp：光标位置平滑逼近目标点，收敛后自停
  const ensureTick = () => {
    if (rafRef.current) return;
    const tick = () => {
      const el = rootRef.current;
      if (!el) {
        rafRef.current = 0;
        return;
      }
      const p = pos.current;
      const t = target.current;
      p.x += (t.x - p.x) * 0.2;
      p.y += (t.y - p.y) * 0.2;
      if (Math.abs(t.x - p.x) < 0.5 && Math.abs(t.y - p.y) < 0.5) {
        p.x = t.x;
        p.y = t.y;
      }
      el.style.setProperty('--x', `${p.x}px`);
      el.style.setProperty('--y', `${p.y}px`);
      rafRef.current =
        p.x === t.x && p.y === t.y ? 0 : requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    pos.current = { x: width / 2, y: height / 2 };
    target.current = { ...pos.current };
    el.style.setProperty('--x', `${pos.current.x}px`);
    el.style.setProperty('--y', `${pos.current.y}px`);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, []);

  const handleMove = (e: React.PointerEvent) => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    target.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    ensureTick();
    if (fadeRef.current) fadeRef.current.style.opacity = '0';
  };

  const handleLeave = () => {
    if (fadeRef.current) fadeRef.current.style.opacity = '1';
  };

  const handleCardMove: React.MouseEventHandler<HTMLElement> = e => {
    const c = e.currentTarget as HTMLElement;
    const rect = c.getBoundingClientRect();
    c.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    c.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={rootRef}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`relative w-full h-full flex flex-wrap justify-center items-start gap-3 ${className}`}
      style={
        {
          '--r': `${radius}px`,
          '--x': '50%',
          '--y': '50%'
        } as React.CSSProperties
      }
    >
      {items.map((c, i) => (
        <article
          key={i}
          onMouseMove={handleCardMove}
          onClick={() => onItemClick?.(c, i)}
          className="group relative flex flex-col w-[200px] rounded-[20px] overflow-hidden border-2 border-transparent transition-colors duration-300 cursor-pointer"
          style={
            {
              '--card-border': c.borderColor || 'transparent',
              background: c.gradient ?? 'linear-gradient(145deg, #4F46E5, #000)',
              '--spotlight-color': 'rgba(255,255,255,0.3)'
            } as React.CSSProperties
          }
        >
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500 z-20 opacity-0 group-hover:opacity-100"
            style={{
              background:
                'radial-gradient(circle at var(--mouse-x) var(--mouse-y), var(--spotlight-color), transparent 70%)'
            }}
          />
          <div className="relative z-10 flex-1 p-[10px] box-border">
            <img
              src={c.image}
              alt={c.title}
              loading="lazy"
              className="w-full aspect-square object-cover rounded-[10px]"
            />
          </div>
          <footer className="relative z-10 p-3 text-white font-sans grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
            <h3 className="m-0 text-[1.05rem] font-semibold">{c.title}</h3>
            {c.handle && <span className="text-[0.95rem] opacity-80 text-right">{c.handle}</span>}
            <p className="m-0 text-[0.85rem] opacity-85">{c.subtitle}</p>
          </footer>
        </article>
      ))}
      <div
        className="absolute inset-0 pointer-events-none z-30"
        style={{
          backdropFilter: 'grayscale(1) brightness(0.78)',
          WebkitBackdropFilter: 'grayscale(1) brightness(0.78)',
          background: 'rgba(0,0,0,0.001)',
          maskImage:
            'radial-gradient(circle var(--r) at var(--x) var(--y),transparent 0%,transparent 15%,rgba(0,0,0,0.10) 30%,rgba(0,0,0,0.22)45%,rgba(0,0,0,0.35)60%,rgba(0,0,0,0.50)75%,rgba(0,0,0,0.68)88%,white 100%)',
          WebkitMaskImage:
            'radial-gradient(circle var(--r) at var(--x) var(--y),transparent 0%,transparent 15%,rgba(0,0,0,0.10) 30%,rgba(0,0,0,0.22)45%,rgba(0,0,0,0.35)60%,rgba(0,0,0,0.50)75%,rgba(0,0,0,0.68)88%,white 100%)'
        }}
      />
      <div
        ref={fadeRef}
        className="absolute inset-0 pointer-events-none transition-opacity duration-[250ms] z-40"
        style={{
          backdropFilter: 'grayscale(1) brightness(0.78)',
          WebkitBackdropFilter: 'grayscale(1) brightness(0.78)',
          background: 'rgba(0,0,0,0.001)',
          maskImage:
            'radial-gradient(circle var(--r) at var(--x) var(--y),white 0%,white 15%,rgba(255,255,255,0.90)30%,rgba(255,255,255,0.78)45%,rgba(255,255,255,0.65)60%,rgba(255,255,255,0.50)75%,rgba(255,255,255,0.32)88%,transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(circle var(--r) at var(--x) var(--y),white 0%,white 15%,rgba(255,255,255,0.90)30%,rgba(255,255,255,0.78)45%,rgba(255,255,255,0.65)60%,rgba(255,255,255,0.50)75%,rgba(255,255,255,0.32)88%,transparent 100%)',
          opacity: 1
        }}
      />
    </div>
  );
};

export default ChromaGrid;
