'use client';

/**
 * 我的音乐（登录用户的个人音乐中心）
 * 三个 tab：创建的歌单 / 收藏的歌单 / 收藏的专辑。
 * 未登录显示扫码引导。
 */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { fetchUserPlaylists, fetchCollectedAlbums } from '@/lib/api';
import type { NetEasePlaylist, NetEaseAlbum } from '@/lib/server/netEase';
import { useNcmProfile } from '@/lib/ncmAuth';
import { PlaylistCard } from '@/components/cards/PlaylistCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/ui/StateViews';

type Tab = 'created' | 'subscribed' | 'albums';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'created', label: '创建的歌单', icon: '🎛️' },
  { id: 'subscribed', label: '收藏的歌单', icon: '⭐' },
  { id: 'albums', label: '收藏的专辑', icon: '💿' },
];

/** 专辑卡片（专辑无播放量概念，单独渲染） */
function AlbumCard({ album, onClick }: { album: NetEaseAlbum; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 cursor-pointer hover:border-pri-mix-45 transition-all hover:-translate-y-1"
    >
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={album.cover}
          alt={album.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          <div className="w-12 h-12 rounded-full bg-pri-mix-30 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-sm text-white/85 truncate font-medium group-hover:text-white transition-colors">
          {album.name}
        </h3>
        {album.artist && <p className="text-xs text-white/40 mt-1 truncate">{album.artist}</p>}
      </div>
    </div>
  );
}

export default function MinePage() {
  const profile = useNcmProfile();
  const [tab, setTab] = useState<Tab>('created');
  const [playlists, setPlaylists] = useState<NetEasePlaylist[]>([]);
  const [albums, setAlbums] = useState<NetEaseAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchUserPlaylists(profile.userId).catch(() => null),
      fetchCollectedAlbums().catch(() => null),
    ])
      .then(([pl, al]) => {
        setPlaylists(pl ?? []);
        setAlbums(al?.albums ?? []);
        if (!pl && !al) setError('个人数据加载失败，请确认已登录并稍后重试');
      })
      .finally(() => setLoading(false));
  }, [profile]);

  if (!profile) {
    return (
      <div className="min-h-screen py-8 px-4 md:px-8 relative">
        <div className="max-w-5xl mx-auto relative z-10 pt-10">
          <PageHeader title="我的音乐" subtitle="登录后查看你的歌单与专辑收藏" />
          <EmptyBlock icon="🔐" title="尚未登录网易云账号" desc="扫码登录后即可在这里查看创建/收藏的歌单与专辑">
            <Link
              href="/login"
              className="px-6 py-3 rounded-full bg-gradient-primary text-white on-accent font-medium hover:opacity-90 transition-opacity"
            >
              去扫码登录
            </Link>
          </EmptyBlock>
        </div>
      </div>
    );
  }

  // 第一个歌单固定是「我喜欢的音乐」；creatorId === 自己 → 创建，否则 → 收藏
  const likedFirst = playlists[0];
  const created = playlists.filter((p) => p.creatorId === profile.userId);
  const subscribed = playlists.filter((p) => p.creatorId !== profile.userId && p.creatorId !== undefined);

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 relative">
      <div className="max-w-7xl mx-auto relative z-10">
        <PageHeader
          title="我的音乐"
          subtitle={`${profile.nickname} · 共 ${created.length} 个创建歌单 / ${subscribed.length} 个收藏歌单 / ${albums.length} 张收藏专辑`}
          action={
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel">
              <Image
                src={profile.avatarUrl}
                alt={profile.nickname}
                width={28}
                height={28}
                className="rounded-full object-cover"
              />
              <span className="text-sm text-white/70 max-w-32 truncate">{profile.nickname}</span>
            </div>
          }
        />

        {/* Tab 切换 */}
        <div className="flex gap-2 mb-8">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                tab === t.id
                  ? 'bg-pri-mix-18 text-white border-pri-mix-45'
                  : 'text-white/50 hover:text-white border-transparent hover:bg-white/5'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading && <LoadingBlock label="正在同步你的音乐库..." />}
        {error && <ErrorBlock message={error} onRetry={() => setTab(tab)} />}

        {!loading && !error && (
          <>
            {/* 「我喜欢的音乐」始终置顶展示（若有） */}
            {tab === 'created' && likedFirst && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                <PlaylistCard playlist={likedFirst} onClick={() => (location.href = `/songlist/${likedFirst.id}`)} />
                {created
                  .filter((p) => p.id !== likedFirst.id)
                  .map((p) => (
                    <PlaylistCard key={p.id} playlist={p} onClick={() => (location.href = `/songlist/${p.id}`)} />
                  ))}
              </div>
            )}

            {tab === 'created' && !likedFirst && created.length === 0 && (
              <EmptyBlock icon="🎛️" title="还没有创建的歌单" desc="在网易云 App 中创建后会同步显示在这里" />
            )}

            {tab === 'subscribed' &&
              (subscribed.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                  {subscribed.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.4) }}
                    >
                      <PlaylistCard playlist={p} onClick={() => (location.href = `/songlist/${p.id}`)} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <EmptyBlock icon="⭐" title="还没有收藏的歌单" desc="在网易云 App 中收藏歌单后会同步显示在这里" />
              ))}

            {tab === 'albums' &&
              (albums.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                  {albums.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.4) }}
                    >
                      <AlbumCard album={a} onClick={() => (location.href = `/album/${a.id}`)} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <EmptyBlock icon="💿" title="还没有收藏的专辑" desc="在网易云 App 中收藏专辑后会同步显示在这里" />
              ))}
          </>
        )}
      </div>
    </div>
  );
}
