import { NextRequest, NextResponse } from 'next/server';
import { searchNetEase, searchArtistsNetEase, searchPlaylistsNetEase } from '@/lib/server/netEase';
import { numParam } from '@/lib/server/auth';

/**
 * 统一搜索：type=song（默认）| artist | playlist
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  const type = request.nextUrl.searchParams.get('type') ?? 'song';
  const limit = numParam(request, 'limit', 30, 1, 50);
  if (!q) {
    return NextResponse.json({ songs: [], artists: [], playlists: [] });
  }
  try {
    if (type === 'artist') {
      const artists = await searchArtistsNetEase(q, limit);
      return NextResponse.json({ artists });
    }
    if (type === 'playlist') {
      const playlists = await searchPlaylistsNetEase(q, limit);
      return NextResponse.json({ playlists });
    }
    const songs = await searchNetEase(q, limit);
    return NextResponse.json({ songs });
  } catch (err) {
    console.error('[api/search]', err);
    return NextResponse.json({ songs: [], artists: [], playlists: [] }, { status: 502 });
  }
}
