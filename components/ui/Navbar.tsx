'use client';

/**
 * 导航栏组件
 * 固定顶部，包含 Logo、导航链接、搜索框、用户区（网易云扫码登录态）。
 */
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useNcmProfile, clearLogin } from '@/lib/ncmAuth';
import { fetchUserPlaylists } from '@/lib/api';
import type { NetEasePlaylist } from '@/lib/server/netEase';
import { toast } from '@/lib/toast';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';

/** 桌面端无边框窗口：在导航栏空白处按下拖拽移动窗口（交互元素除外） */
async function startWindowDrag(e: React.MouseEvent<HTMLElement>): Promise<void> {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return;
  const target = e.target as HTMLElement;
  if (target.closest('a, button, input, [role="button"], [data-no-drag]')) return;
  try {
    const { winStartDrag } = await import('@/lib/desktop');
    await winStartDrag();
  } catch (err) {
    console.error('[navbar drag]', err);
  }
}

const navLinks = [
  { href: '/', label: '首页', icon: '🏠' },
  { href: '/songlist', label: '歌单', icon: '📋' },
  { href: '/singer', label: '歌手', icon: '🎤' },
  { href: '/musictop', label: '排行榜', icon: '🏆' },
  { href: '/history', label: '最近在听', icon: '🕒' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useNcmProfile();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<NetEasePlaylist[]>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { online } = useNetworkStatus();

  // 监听滚动
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 打开用户菜单时拉取我的歌单
  useEffect(() => {
    if (userMenuOpen && profile && userPlaylists.length === 0) {
      fetchUserPlaylists(profile.userId)
        .then(setUserPlaylists)
        .catch(() => {});
    }
  }, [userMenuOpen, profile, userPlaylists.length]);

  // 可视化沉浸页独占全屏（页面自带返回/控制），隐藏导航栏
  if (pathname === '/visualizer') return null;

  const handleLogout = () => {
    clearLogin();
    setUserMenuOpen(false);
    setUserPlaylists([]);
    toast('已退出登录', 'info');
    router.refresh();
  };

  return (
    <>
      {/* 离线状态横幅：在线时隐藏 */}
      {!online && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500/90 text-black text-xs text-center py-1 font-medium">
          ⛔ 网络已断开 · 搜索/切歌不可用，已缓存页面仍可浏览
        </div>
      )}
      <nav
        onMouseDown={startWindowDrag}
        className={`
          fixed top-0 left-0 right-0 z-50
          transition-all duration-300
          pr-[144px]
          ${scrolled
            ? 'py-2 shadow-glass'
            : 'py-4'
          }
          ${online ? '' : 'pt-8'}
        `}
        style={{
          background: scrolled ? 'var(--panel-nav-bg)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--glass-border)' : 'none',
        }}
      >
        <div className="container-glass flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold text-lg"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              雅
            </motion.div>
            <span className="text-xl font-bold gradient-text hidden min-[1180px]:block">
              雅枫音乐
            </span>
          </Link>

          {/* 桌面导航 */}
          <div className="hidden min-[900px]:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <span className="mr-1.5 hidden xl:inline">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* 搜索框 */}
          <div className="hidden lg:flex items-center">
            <motion.form
              onSubmit={(e) => {
                e.preventDefault();
                const q = searchKeyword.trim();
                if (!q) return;
                router.push(`/search?q=${encodeURIComponent(q)}`);
              }}
              className="glass-panel px-4 py-2 flex items-center gap-2 w-48 focus-within:border-white/20 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索音乐..."
                className="bg-transparent text-sm text-white placeholder-white/40 w-full outline-none"
              />
            </motion.form>
          </div>

          {/* 用户区域 */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSwitcher />

            <Link href="/settings" className="hidden md:flex p-2 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white" title="设置">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.065-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </Link>
      <Link href="/likes" className="hidden md:flex">
              <motion.div
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>💗</span> 喜欢
              </motion.div>
            </Link>

            {profile ? (
              <div className="relative" ref={userMenuRef}>
                <motion.button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-pri-mix-45 relative bg-white/10">
                    <Image src={profile.avatarUrl} alt={profile.nickname} width={32} height={32} className="object-cover" />
                  </div>
                  <span className="text-sm font-medium text-white max-w-20 truncate hidden sm:block">
                    {profile.nickname}
                  </span>
                </motion.button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-64 glass-panel rounded-2xl p-2 shadow-2xl shadow-black/50 z-50"
                    >
                      <div className="px-3 py-2 border-b border-white/10">
                        <p className="text-sm font-medium text-white truncate">{profile.nickname}</p>
                        <p className="text-xs text-white/40">网易云音乐账号</p>
                      </div>
                      <Link
                        href="/mine"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-white hover:bg-white/10 transition-colors border-b border-white/10"
                      >
                        <span>🎧 我的音乐</span>
                        <span className="text-white/30 text-xs">歌单 · 专辑 →</span>
                      </Link>
                      <div
                        data-lenis-prevent
                        className="max-h-56 overflow-y-auto overflow-x-hidden overscroll-contain py-1 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
                      >
                        <p className="px-3 py-1.5 text-xs text-white/30">我的歌单</p>
                        {userPlaylists.length === 0 && (
                          <p className="px-3 py-2 text-xs text-white/30">加载中...</p>
                        )}
                        {userPlaylists.map((p) => (
                          <Link
                            key={p.id}
                            href={`/songlist/${p.id}`}
                            onClick={() => setUserMenuOpen(false)}
                            className="block px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors truncate"
                          >
                            📋 {p.name}
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-white/10 pt-1">
                        <motion.button
                          onClick={handleLogout}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full px-3 py-2 rounded-xl text-sm text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors text-left"
                        >
                          ⏻ 退出登录
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-primary text-white on-accent hover:opacity-90 transition-opacity"
              >
                登录
              </Link>
            )}

            {/* 移动端菜单按钮 */}
            <motion.button
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </motion.button>
          </div>
        </div>

        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 mx-4 p-4 glass-panel">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    block px-4 py-3 rounded-xl text-sm font-medium mb-1
                    transition-all duration-200
                    ${isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <span className="mr-2">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-medium mb-1 text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              <span className="mr-2">🔍</span>
              搜索
            </Link>
            <Link
              href="/likes"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-medium mb-1 text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              <span className="mr-2">💗</span>
              我的喜欢
            </Link>
          </div>
        )}
      </nav>
    </>
  );
}
