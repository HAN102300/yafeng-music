'use client';

/**
 * 全局错误边界（App Router 约定文件）
 * 捕获未处理的运行时异常，提供重试与返回首页出口。
 */
import { useEffect } from 'react';
import { EmptyBlock } from '@/components/ui/StateViews';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <EmptyBlock icon="⚠️" title="页面出错了" desc="应用发生意外异常，可以尝试重新加载或返回首页">
        <button
          onClick={reset}
          className="px-5 py-2 rounded-xl text-sm bg-white/10 text-white hover:bg-white/15 transition-colors"
        >
          重新加载
        </button>
        <button
          onClick={() => (window.location.href = '/')}
          className="px-5 py-2 rounded-xl text-sm glass-panel text-white/70 hover:text-white transition-colors"
        >
          返回首页
        </button>
      </EmptyBlock>
    </div>
  );
}
