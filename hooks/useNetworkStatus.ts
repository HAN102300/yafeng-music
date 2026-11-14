'use client';

/**
 * useNetworkStatus - 网络连接状态订阅
 * - 监听 window online/offline 事件实时更新
 * - getNetworkStatus() 供事件回调、store action 等非 Hook 环境读取当前快照
 * - SSR 环境下快照恒为在线（浏览器端挂载后立即同步真实值）
 */
import { useEffect, useState } from 'react';

export function getNetworkStatus(): { online: boolean } {
  if (typeof window === 'undefined') return { online: true };
  return { online: navigator.onLine };
}

export function useNetworkStatus() {
  const [online, setOnline] = useState(() =>
    typeof window === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  return { online };
}
