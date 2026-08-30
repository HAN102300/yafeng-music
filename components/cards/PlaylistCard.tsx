'use client';

/**
 * 歌单卡片（歌单广场 / 首页推荐 / 搜索结果复用）
 */
import Image from 'next/image';
import { formatPlayCount } from '@/lib/format';
import type { NetEasePlaylist } from '@/lib/server/netEase';

interface PlaylistCardProps {
  playlist: NetEasePlaylist;
  onClick: () => void;
}

export function PlaylistCard({ playlist, onClick }: PlaylistCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 cursor-pointer hover:border-pri-mix-45 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
    >
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={playlist.cover}
          alt={playlist.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="on-image absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white/80 border border-white/10 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {formatPlayCount(playlist.playCount)}
        </div>
        <div className="on-image absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white/90 border border-white/10">
          {playlist.trackCount}首
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-pri-mix-30 backdrop-blur-sm flex items-center justify-center shadow-lg ">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-sm text-white/85 truncate font-medium group-hover:text-white transition-colors">
          {playlist.name}
        </h3>
        {playlist.creator && (
          <p className="text-xs text-white/40 mt-1 truncate">by {playlist.creator}</p>
        )}
      </div>
    </div>
  );
}
