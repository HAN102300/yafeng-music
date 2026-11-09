import { NextRequest, NextResponse } from 'next/server';
import { likeSongNetEase } from '@/lib/server/netEase';
import { musicUFromRequest } from '@/lib/server/auth';

/** 喜欢/取消喜欢歌曲（需登录；trackId 为网易云歌曲 id） */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { trackId?: number; like?: boolean };
    const trackId = Number(body.trackId);
    const like = body.like !== false;
    if (!Number.isFinite(trackId) || trackId <= 0) {
      return NextResponse.json({ ok: false, error: '参数错误' }, { status: 400 });
    }
    const musicU = musicUFromRequest(request);
    if (!musicU) {
      return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 });
    }
    const result = await likeSongNetEase(trackId, like, musicU);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/song-like]', err);
    return NextResponse.json({ ok: false, error: '服务异常' }, { status: 502 });
  }
}
