import { NextRequest, NextResponse } from 'next/server';
import { getDailyRecommendNetEase } from '@/lib/server/netEase';
import { musicUFromRequest } from '@/lib/server/auth';

/** 每日推荐（需登录：请求头携带 x-ncm-music-u） */
export async function GET(request: NextRequest) {
  try {
    const songs = await getDailyRecommendNetEase(musicUFromRequest(request));
    return NextResponse.json({ songs });
  } catch (err) {
    console.error('[api/recommend-songs]', err);
    return NextResponse.json({ songs: [] }, { status: 502 });
  }
}
