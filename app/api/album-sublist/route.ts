import { NextRequest, NextResponse } from 'next/server';
import { getAlbumSublistNetEase } from '@/lib/server/netEase';
import { musicUFromRequest, numParam } from '@/lib/server/auth';

/** 当前账号收藏的专辑（需登录：请求头携带 x-ncm-music-u） */
export async function GET(request: NextRequest) {
  const limit = numParam(request, 'limit', 30, 1, 100);
  const offset = numParam(request, 'offset', 0, 0);
  try {
    const result = await getAlbumSublistNetEase(musicUFromRequest(request), limit, offset);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/album-sublist]', err);
    return NextResponse.json({ albums: [], more: false }, { status: 502 });
  }
}
