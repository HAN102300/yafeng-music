'use client';

/**
 * 歌手圆形卡片（首页热门歌手 / 歌手页 / 搜索结果复用）
 */
import Image from 'next/image';
import type { NetEaseArtist } from '@/lib/server/netEase';

interface ArtistCardProps {
  artist: NetEaseArtist;
  onClick: () => void;
}

export function ArtistCard({ artist, onClick }: ArtistCardProps) {
  return (
    <div
      onClick={onClick}
      className="group flex flex-col items-center cursor-pointer"
    >
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-acc transition-all relative bg-white/5">
        <Image
          src={artist.avatar}
          alt={artist.name}
          width={96}
          height={96}
          className="object-cover transition-transform duration-300 group-hover:scale-110"
        />
      </div>
      <p className="text-xs md:text-sm text-white/60 group-hover:text-white mt-2 transition-colors truncate max-w-24">
        {artist.name}
      </p>
      {artist.musicSize !== undefined && artist.musicSize > 0 && (
        <p className="text-[10px] text-white/30">{artist.musicSize} 首</p>
      )}
    </div>
  );
}
