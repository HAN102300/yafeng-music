/**
 * Route Handler 公共小工具
 */
import type { NextRequest } from 'next/server';

/** 从请求头提取网易云登录态（客户端登录后每次 API 调用携带 x-ncm-music-u） */
export function musicUFromRequest(request: NextRequest): string | null {
  const v = request.headers.get('x-ncm-music-u');
  return v && v.trim() ? v.trim() : null;
}

/** 数字参数解析（非法回退默认值） */
export function numParam(
  request: NextRequest,
  key: string,
  fallback: number,
  min?: number,
  max?: number
): number {
  const raw = request.nextUrl.searchParams.get(key);
  const n = Number(raw ?? fallback);
  let v = Number.isFinite(n) ? n : fallback;
  if (min !== undefined) v = Math.max(min, v);
  if (max !== undefined) v = Math.min(max, v);
  return v;
}
