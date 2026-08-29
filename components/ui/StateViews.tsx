'use client';

/**
 * 页面通用状态视图：加载 / 错误（可重试）/ 空态
 */
import { motion } from 'framer-motion';

export function LoadingBlock({ label = '加载中...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-purple-400 animate-spin" />
      <p className="text-sm text-white/40">{label}</p>
    </div>
  );
}

export function ErrorBlock({
  message = '加载失败，网络异常或服务暂不可用',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <p className="text-4xl">📡</p>
      <p className="text-white/60">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 rounded-xl text-sm bg-white/10 text-white hover:bg-white/15 transition-colors"
        >
          重新加载
        </button>
      )}
    </div>
  );
}

export function EmptyBlock({
  icon = '🎵',
  title,
  desc,
  children,
}: {
  icon?: string;
  title: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-16 text-center"
    >
      <div className="text-6xl mb-6">{icon}</div>
      <h2 className="text-2xl font-semibold text-white mb-3">{title}</h2>
      {desc && <p className="text-white/50 mb-2">{desc}</p>}
      {children && <div className="mt-6 flex items-center justify-center gap-4">{children}</div>}
    </motion.div>
  );
}
