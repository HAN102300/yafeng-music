import { NextRequest, NextResponse } from 'next/server';
import { getPlaylistListNetEase } from '@/lib/server/netEase';
import { numParam } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  const cat = request.nextUrl.searchParams.get('cat') ?? '全部';
  const limit = numParam(request, 'limit', 35, 1, 100);
  const offset = numParam(request, 'offset', 0, 0);
  const high = request.nextUrl.searchParams.get('high') === '1';
  try {
    const result = await getPlaylistListNetEase(cat, limit, offset, high);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/playlist-hot]', err);
    return NextResponse.json({ playlists: [], more: false }, { status: 502 });
  }
}
