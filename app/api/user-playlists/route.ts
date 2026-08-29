import { NextRequest, NextResponse } from 'next/server';
import { getUserPlaylistsNetEase } from '@/lib/server/netEase';
import { musicUFromRequest, numParam } from '@/lib/server/auth';

/** 用户自己的歌单（需登录：请求头携带 x-ncm-music-u） */
export async function GET(request: NextRequest) {
  const uid = numParam(request, 'uid', 0);
  if (!uid) {
    return NextResponse.json({ playlists: [] }, { status: 400 });
  }
  try {
    const playlists = await getUserPlaylistsNetEase(uid, musicUFromRequest(request));
    return NextResponse.json({ playlists });
  } catch (err) {
    console.error('[api/user-playlists]', err);
    return NextResponse.json({ playlists: [] }, { status: 502 });
  }
}
