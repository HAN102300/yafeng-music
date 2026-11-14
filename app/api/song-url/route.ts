import { NextRequest, NextResponse } from 'next/server';
import { getSongUrlNetEase, type SongQuality } from '@/lib/server/netEase';
import { numParam } from '@/lib/server/auth';

const LEVELS: SongQuality[] = ['standard', 'higher', 'exhigh', 'lossless', 'hires'];

export async function GET(request: NextRequest) {
  const id = numParam(request, 'id', 0);
  const levelParam = request.nextUrl.searchParams.get('level') as SongQuality | null;
  const level = levelParam && LEVELS.includes(levelParam) ? levelParam : 'standard';
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 });
  }
  try {
    const result = await getSongUrlNetEase(id, level);
    if (!result || !result.url) {
      // 无可用地址：404 但带上游 fee（VIP=1/4），前端据此区分失败原因
      return NextResponse.json(
        { error: 'no url', fee: result?.fee ?? 0 },
        { status: 404 }
      );
    }
    // 网易云返回的音频重定向域名兼容 CORS：显式放开，使 <audio crossorigin> 加载不报错
    const res = NextResponse.json(result);
    res.headers.set('Access-Control-Allow-Origin', '*');
    // URL 与缓存余量对齐（约 20 分钟有效期），避免共享缓存下发过期地址
    res.headers.set('Cache-Control', 'public, max-age=1080');
    return res;
  } catch (err) {
    console.error('[api/song-url]', err);
    return NextResponse.json({ error: 'failed' }, { status: 502 });
  }
}
