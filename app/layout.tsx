import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/ui/Navbar';
import PlayerBar from '@/components/ui/PlayerBar';
import GlobalAudioEngine from '@/components/player/GlobalAudioEngine';
import { GlobalVisualizerBackground } from '@/components/visualizer/GlobalVisualizerBackground';
import SmoothScroll from '@/components/animations/SmoothScroll';
import Toast from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: '雅枫音乐 - 聆听美好',
  description: '雅枫音乐 - 沉浸式可视化音乐播放器，让音乐看得见',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#0a0a1a] min-h-screen text-white antialiased">
        {/* 静态底色光斑（全局可视化背景之下的兜底氛围） */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-600/5 rounded-full blur-[80px]" />
        </div>

        {/* 全局音乐驱动背景可视化（封面取色氛围 + 全屏场景 + 可读性遮罩） */}
        <GlobalVisualizerBackground />

        {/* 全局音频引擎（无头，唯一音源） */}
        <GlobalAudioEngine />

        {/* 丝滑滚动 */}
        <SmoothScroll />

        {/* 导航栏 */}
        <Navbar />

        {/* 主内容 */}
        <main className="relative z-10 pt-20 pb-24">
          {children}
        </main>

        {/* 底部播放栏 */}
        <PlayerBar />

        {/* 全局 Toast */}
        <Toast />
      </body>
    </html>
  );
}
