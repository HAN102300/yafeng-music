import type { NextConfig } from 'next';

// DESKTOP_BUILD=1 时：standalone 输出（供 Tauri sidecar 使用）+ 关闭图片优化服务
// （桌面端无独立 Node 图片优化服务依赖，直接由浏览器加载远端图片）
const isDesktop = process.env.DESKTOP_BUILD === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isDesktop ? { output: 'standalone' as const } : {}),
  images: {
    // 网易云封面/头像 CDN；本地兜底图走本地路径不在此列
    remotePatterns: [
      { protocol: 'https', hostname: '**.music.126.net' },
    ],
    ...(isDesktop ? { unoptimized: true } : {}),
  },
};

export default nextConfig;
