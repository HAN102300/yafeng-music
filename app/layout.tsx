import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/ui/Navbar';
import PlayerBar from '@/components/ui/PlayerBar';
import GlobalAudioEngine from '@/components/player/GlobalAudioEngine';
import { MobileAudioUnlock } from '@/components/player/MobileAudioUnlock';
import { GlobalVisualizerBackground } from '@/components/visualizer/GlobalVisualizerBackground';
import SmoothScroll from '@/components/animations/SmoothScroll';
import Toast from '@/components/ui/Toast';
import { DesktopBridge } from '@/components/player/DesktopBridge';
import { TitleBarControls } from '@/components/ui/TitleBarControls';
import { UpdateChecker } from '@/components/updater/UpdateChecker';
import ThemeSync from '@/components/ui/ThemeSync';

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
    <html lang="zh-CN" data-theme="nebula" data-mode="dark" suppressHydrationWarning>
      <body className="bg-[var(--color-dark-base)] min-h-screen text-white antialiased">
        {/* 静态底色光斑（全局可视化背景之下的兜底氛围，颜色随主题） */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="ambient-orb w-96 h-96 top-0 left-1/4 opacity-[0.08]" />
          <div className="ambient-orb w-80 h-80 bottom-1/4 right-1/4 opacity-[0.06]" />
          <div className="ambient-orb w-64 h-64 top-1/2 left-1/2 opacity-[0.04]" />
        </div>

        {/* 主题同步（data-theme 应用） */}
        <ThemeSync />

        {/* 全局音乐驱动背景可视化（封面取色氛围 + 全屏场景 + 可读性遮罩） */}
        <GlobalVisualizerBackground />

        {/* 全局音频引擎（无头，唯一音源） */}
        <GlobalAudioEngine />

        {/* iOS Safari 自动播放解锁（首次手势零噪音 load） */}
        <MobileAudioUnlock />

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

        {/* 桌面端桥接 + 自定义标题栏（仅 Tauri 环境生效） */}
        <DesktopBridge />
        <TitleBarControls />
        <UpdateChecker />
      </body>
    </html>
  );
}
