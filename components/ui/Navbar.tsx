'use client';

/**
 * 导航栏组件
 * 固定顶部，包含 Logo、导航链接、搜索框
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';

const navLinks = [
  { href: '/', label: '首页', icon: '🏠' },
  { href: '/songlist', label: '歌单', icon: '📋' },
  { href: '/singer', label: '歌手', icon: '🎤' },
  { href: '/musictop', label: '排行榜', icon: '🏆' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [session, setSession] = useState<string | null>(null);

  // 监听登录会话（客户端）
  useEffect(() => {
    setSession(getSession());
    const onStorage = () => setSession(getSession());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 监听滚动
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`
          fixed top-0 left-0 right-0 z-50
          transition-all duration-300
          ${scrolled
            ? 'py-2 shadow-glass'
            : 'py-4'
          }
        `}
        style={{
          background: scrolled ? 'rgba(12, 12, 29, 0.8)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.1)' : 'none',
        }}
      >
        <div className="container-glass flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
              雅
            </div>
            <span className="text-xl font-bold gradient-text hidden sm:block">
              雅枫音乐
            </span>
          </Link>

          {/* 桌面导航 */}
          <div className="hidden md:flex items-center gap-1">
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
                  <span className="mr-1.5">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* 搜索框 */}
          <div className="hidden lg:flex items-center">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = searchKeyword.trim();
                if (!q) return;
                router.push(`/search?q=${encodeURIComponent(q)}`);
              }}
              className="glass-panel px-4 py-2 flex items-center gap-2 w-48 focus-within:border-white/20 transition-colors"
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
            </form>
          </div>

          {/* 用户区域 */}
          <div className="flex items-center gap-3">
            <Link
              href="/likes"
              className="hidden md:flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <span>💗</span> 喜欢
            </Link>
            {session ? (
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-sm font-medium glass-panel text-white hover:bg-white/10 transition-colors"
              >
                {session}
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-primary text-white hover:opacity-90 transition-opacity"
              >
                登录
              </Link>
            )}

            {/* 移动端菜单按钮 */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
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
