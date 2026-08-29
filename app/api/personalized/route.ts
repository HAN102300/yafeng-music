import { NextRequest, NextResponse } from 'next/server';
import { getPersonalizedNetEase } from '@/lib/server/netEase';
import { numParam } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  const limit = numParam(request, 'limit', 10, 1, 30);
  try {
    const playlists = await getPersonalizedNetEase(limit);
    return NextResponse.json({ playlists });
  } catch (err) {
    console.error('[api/personalized]', err);
    return NextResponse.json({ playlists: [] }, { status: 502 });
  }
}
