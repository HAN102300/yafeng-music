import { NextRequest, NextResponse } from 'next/server';
import { getPersonalizedNewSongNetEase } from '@/lib/server/netEase';
import { numParam } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  const limit = numParam(request, 'limit', 12, 1, 30);
  try {
    const songs = await getPersonalizedNewSongNetEase(limit);
    return NextResponse.json({ songs });
  } catch (err) {
    console.error('[api/newsong]', err);
    return NextResponse.json({ songs: [] }, { status: 502 });
  }
}
