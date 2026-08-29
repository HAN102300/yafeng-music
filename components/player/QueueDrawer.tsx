'use client';

/**
 * 播放队列抽屉：当前队列列表（点击切歌 / 移除单曲 / 清空队列）
 */
import Image from 'next/image';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { motion } from 'framer-motion';
import { useMusicStore } from '@/lib/store';
import { formatDuration } from '@/lib/format';

interface QueueDrawerProps {
  onClose: () => void;
}

export function QueueDrawer({ onClose }: QueueDrawerProps) {
  // 弹层期间锁定背景页面滚动，避免滚轮穿透
  useBodyScrollLock(true);
  const playlist = useMusicStore((s) => s.playlist);
  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const play = useMusicStore((s) => s.play);
  const removeFromQueue = useMusicStore((s) => s.removeFromQueue);
  const clearQueue = useMusicStore((s) => s.clearQueue);
  const togglePlay = useMusicStore((s) => s.togglePlay);

  return (
    <>
      {/* 遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[65] bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 抽屉 */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="fixed top-0 right-0 bottom-0 z-[70] w-[min(380px,92vw)] flex flex-col border-l border-white/10"
        style={{
          background: 'rgba(12,12,29,0.96)',
          backdropFilter: 'blur(24px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-white">当前播放</h2>
            <p className="text-xs text-white/40 mt-0.5">共 {playlist.length} 首</p>
          </div>
          <div className="flex items-center gap-1">
            {playlist.length > 0 && (
              <button
                onClick={clearQueue}
                className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                title="清空队列"
              >
                🗑 清空
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
              title="关闭"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-1 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          {playlist.length === 0 ? (
            <div className="text-center py-20 text-white/30 text-sm">队列是空的</div>
          ) : (
            playlist.map((track, i) => {
              const isCurrent = currentSong?.id === track.id;
              return (
                <motion.div
                  key={`${track.id}-${i}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  onClick={() => (isCurrent ? togglePlay() : play(track))}
                  className={`group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                    isCurrent ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <span className="w-6 text-center text-xs text-white/30 tabular-nums flex-shrink-0">
                    {isCurrent && isPlaying ? (
                      <span className="inline-flex items-end gap-0.5 h-3">
                        <span className="w-0.5 bg-acc rounded-full animate-pulse" style={{ height: '60%' }} />
                        <span className="w-0.5 bg-acc rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.15s' }} />
                        <span className="w-0.5 bg-acc rounded-full animate-pulse" style={{ height: '45%', animationDelay: '0.3s' }} />
                      </span>
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative bg-white/5">
                    <Image src={track.cover} alt={track.title} width={40} height={40} className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isCurrent ? 'text-acc font-medium' : 'text-white'}`}>
                      {track.title}
                    </p>
                    <p className="text-xs text-white/40 truncate">{track.artist}</p>
                  </div>
                  <span className="text-xs text-white/30 tabular-nums hidden sm:block">
                    {formatDuration(track.duration ?? 0)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(track.id);
                    }}
                    className="p-1.5 rounded-full text-white/25 hover:text-red-300 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title="从队列移除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    </>
  );
}
