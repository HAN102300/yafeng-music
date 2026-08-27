import { NextRequest, NextResponse } from 'next/server';
import { getSongUrlNetEase } from '@/lib/server/netEase';

export async function GET(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 });
  }
  try {
    const result = await getSongUrlNetEase(id);
    if (!result) {
      return NextResponse.json({ error: 'no url' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/song-url]', err);
    return NextResponse.json({ error: 'failed' }, { status: 502 });
  }
}
