'use client';

/**
 * 音乐卡片组件
 * 展示歌曲信息，支持悬停效果和播放按钮
 */
import { useState } from 'react';
import { Song } from '@/lib/data';
import { useMusicStore } from '@/lib/store';

interface MusicCardProps {
  song: Song;
  index?: number;
}

export default function MusicCard({ song, index }: MusicCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const currentSong = useMusicStore((s) => s.currentSong);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const play = useMusicStore((s) => s.play);
  const pause = useMusicStore((s) => s.pause);

  const isCurrentSong = currentSong?.id === song.id;
  const isCurrentlyPlaying = isCurrentSong && isPlaying;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentSong) {
      if (isPlaying) {
        pause();
      } else {
        play(song);
      }
    } else {
      play(song);
    }
  };

  return (
    <div
      className="group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => play(song)}
    >
      {/* 封面区域 */}
      <div className="relative aspect-square rounded-lg overflow-hidden mb-3">
        <img
          src={song.cover}
          alt={song.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* 播放按钮遮罩 */}
        <div
          className={`
            absolute inset-0 bg-black/40 flex items-center justify-center
            transition-opacity duration-300
            ${isHovered || isCurrentlyPlaying ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <button
            className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-600/80 hover:bg-purple-600 transition-colors shadow-lg"
            onClick={handlePlayClick}
          >
            {isCurrentlyPlaying ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* 播放中指示 */}
        {isCurrentlyPlaying && (
          <div className="absolute bottom-2 left-2 flex items-end gap-0.5 h-4 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
            <div className="w-0.5 bg-purple-400 animate-pulse" style={{ height: '60%' }} />
            <div className="w-0.5 bg-purple-400 animate-pulse" style={{ height: '100%', animationDelay: '0.2s' }} />
            <div className="w-0.5 bg-purple-400 animate-pulse" style={{ height: '40%', animationDelay: '0.4s' }} />
          </div>
        )}

        {/* 序号 */}
        {index !== undefined && (
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
            <span className="text-xs text-white font-medium">{index + 1}</span>
          </div>
        )}
      </div>

      {/* 歌曲信息 */}
      <h3 className={`font-medium truncate text-sm mb-0.5 ${isCurrentSong ? 'text-purple-400' : 'text-white'}`}>
        {song.title}
      </h3>
      <p className="text-xs text-white/50 truncate">{song.artist}</p>
    </div>
  );
}
