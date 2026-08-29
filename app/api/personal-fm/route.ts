import { NextRequest, NextResponse } from 'next/server';
import { getPersonalFMNetEase } from '@/lib/server/netEase';
import { musicUFromRequest } from '@/lib/server/auth';

/** 私人 FM（需登录：请求头携带 x-ncm-music-u） */
export async function GET(request: NextRequest) {
  try {
    const songs = await getPersonalFMNetEase(musicUFromRequest(request));
    return NextResponse.json({ songs });
  } catch (err) {
    console.error('[api/personal-fm]', err);
    return NextResponse.json({ songs: [] }, { status: 502 });
  }
}
