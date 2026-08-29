import { NextRequest, NextResponse } from 'next/server';
import { getTopArtistsNetEase } from '@/lib/server/netEase';
import { numParam } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  const limit = numParam(request, 'limit', 30, 1, 100);
  const offset = numParam(request, 'offset', 0, 0);
  try {
    const artists = await getTopArtistsNetEase(limit, offset);
    return NextResponse.json({ artists });
  } catch (err) {
    console.error('[api/artist-hot]', err);
    return NextResponse.json({ artists: [] }, { status: 502 });
  }
}
