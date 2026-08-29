'use client';

/**
 * 通用曲目列表（歌单详情 / 歌手热门 / 榜单 / 喜欢 / 队列复用）
 * 纯视图：高亮当前曲、VIP 徽标、行内喜欢按钮、悬停播放按钮。
 */
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useMusicStore } from '@/lib/store';
import { formatDuration } from '@/lib/format';
import type { Track } from '@/lib/data';

interface TrackListProps {
  tracks: Track[];
  /** 点击行触发；默认整列入队并从该行播放 */
  onPlay?: (index: number) => void;
  /** 序号起始（分页追加场景） */
  startIndex?: number;
  className?: string;
  /** 隐藏序号列（移动端紧凑模式） */
  hideIndex?: boolean;
}

export function TrackList({ tracks, onPlay, startIndex = 0, className = '', hideIndex = false }: TrackListProps) {
  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const play = useMusicStore((s) => s.play);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const toggleLike = useMusicStore((s) => s.toggleLike);
  const likedTracks = useMusicStore((s) => s.likedTracks);

  const handleRow = (index: number) => {
    if (onPlay) onPlay(index);
    else playQueueFromDefault(tracks, index);
  };
  const playQueueFromDefault = (list: Track[], index: number) => {
    useMusicStore.getState().playQueueFrom(list, index);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {tracks.map((track, i) => {
        const isCurrent = currentSong?.id === track.id;
        const isPlayingThis = isCurrent && isPlaying;
        const liked = likedTracks.some((t) => t.id === track.id);
        const index = startIndex + i;

        return (
          <motion.div
            key={`${track.id}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.5) }}
            onClick={() => handleRow(i)}
            className={`group flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-2xl cursor-pointer transition-all border ${
              isCurrent
                ? 'bg-white/10 border-pri-mix-45 shadow-lg'
                : 'border-transparent hover:bg-white/5'
            }`}
          >
            {/* 序号 / 播放态 */}
            {!hideIndex && (
              <span className="w-7 text-center text-sm text-white/30 flex-shrink-0 tabular-nums">
                {isCurrent && isPlaying ? (
                  <span className="inline-flex items-end gap-0.5 h-3.5">
                    <span className="w-0.5 bg-acc rounded-full animate-pulse" style={{ height: '60%' }} />
                    <span className="w-0.5 bg-acc rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.15s' }} />
                    <span className="w-0.5 bg-acc rounded-full animate-pulse" style={{ height: '45%', animationDelay: '0.3s' }} />
                  </span>
                ) : (
                  index + 1
                )}
              </span>
            )}

            {/* 封面 */}
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-lg overflow-hidden flex-shrink-0 relative bg-white/5">
              <Image src={track.cover} alt={track.title} width={48} height={48} className="object-cover" />
            </div>

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate flex items-center gap-1.5 ${isCurrent ? 'text-acc' : 'text-white'}`}>
                <span className="truncate">{track.title}</span>
                {(track.fee ?? 0) > 0 && (
                  <span className="px-1.5 py-px rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                    VIP
                  </span>
                )}
              </p>
              <p className="text-xs text-white/50 truncate">{track.artist}</p>
            </div>

            {/* 喜欢 */}
            <button
              className={`w-8 h-8 rounded-full hidden sm:flex items-center justify-center transition-all flex-shrink-0 ${
                liked ? 'text-red-400' : 'text-white/30 hover:text-white opacity-0 group-hover:opacity-100'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                toggleLike(track);
              }}
              title={liked ? '取消喜欢' : '喜欢'}
            >
              <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>

            {/* 时长 */}
            <span className="text-xs text-white/40 tabular-nums flex-shrink-0 hidden md:block w-10 text-right">
              {formatDuration(track.duration ?? 0)}
            </span>

            {/* 播放按钮 */}
            <button
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                isPlayingThis
                  ? 'bg-gradient-primary text-white'
                  : 'bg-white/5 text-white/70 group-hover:bg-white/15'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (isCurrent) togglePlay();
                else play(track);
              }}
            >
              {isPlayingThis ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
