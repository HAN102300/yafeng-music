'use client';

/**
 * 页面通用状态视图：加载 / 错误（可重试）/ 空态
 */
import { motion } from 'framer-motion';

export function LoadingBlock({ label = '加载中...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <motion.div
        className="w-10 h-10 rounded-full border-3 border-white/20 border-t-accent animate-spin"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <p className="text-sm text-white/50">{label}</p>
    </div>
  );
}

/**
 * 歌单卡片骨架屏
 */
export function PlaylistSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/5 bg-white/5 animate-pulse">
      <div className="relative aspect-square bg-white/10" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/10 rounded w-1/2" />
      </div>
    </div>
  );
}

/**
 * 歌手卡片骨架屏
 */
export function ArtistSkeleton() {
  return (
    <div className="flex flex-col items-center animate-pulse">
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/10" />
      <div className="h-4 bg-white/10 rounded w-16 mt-3" />
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
