import Link from 'next/link';
import { EmptyBlock } from '@/components/ui/StateViews';

/**
 * 404 页面：引导返回首页或去搜索
 */
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <EmptyBlock icon="🎼" title="页面不存在" desc="这个地址没有对应的页面，可能已移动或从未存在">
        <Link
          href="/"
          className="px-5 py-2 rounded-xl text-sm bg-white/10 text-white hover:bg-white/15 transition-colors"
        >
          返回首页
        </Link>
        <Link
          href="/search"
          className="px-5 py-2 rounded-xl text-sm glass-panel text-white/70 hover:text-white transition-colors"
        >
          去搜索音乐
        </Link>
      </EmptyBlock>
    </div>
  );
}
