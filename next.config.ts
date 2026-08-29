import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // 网易云封面/头像 CDN；本地兜底图走本地路径不在此列
    remotePatterns: [
      { protocol: 'https', hostname: '**.music.126.net' },
    ],
  },
};

export default nextConfig;
