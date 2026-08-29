import { NextRequest, NextResponse } from 'next/server';
import { getArtistNetEase } from '@/lib/server/netEase';
import { musicUFromRequest, numParam } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  const id = numParam(request, 'id', 0);
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 });
  }
  try {
    const result = await getArtistNetEase(id, musicUFromRequest(request));
    if (!result) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/artist]', err);
    return NextResponse.json({ error: 'failed' }, { status: 502 });
  }
}
