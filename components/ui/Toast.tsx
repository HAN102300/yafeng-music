'use client';

/**
 * 全局 Toast 渲染层（挂载于根布局，纯视图）
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore, type ToastKind } from '@/lib/toast';

const KIND_STYLES: Record<ToastKind, string> = {
  info: 'glass-panel text-white',
  error: 'bg-red-500/15 border border-red-400/30 text-red-100',
  success: 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-100',
};

export default function Toast() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`pointer-events-auto px-4 py-2.5 rounded-xl text-sm shadow-glow backdrop-blur-xl cursor-pointer ${KIND_STYLES[t.kind]}`}
            onClick={() => remove(t.id)}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
