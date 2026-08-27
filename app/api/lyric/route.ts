import { NextRequest, NextResponse } from 'next/server';
import { getLyricNetEase } from '@/lib/server/netEase';

export async function GET(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!id) {
    return NextResponse.json({ lyric: null }, { status: 400 });
  }
  try {
    const lyric = await getLyricNetEase(id);
    return NextResponse.json({ lyric });
  } catch (err) {
    console.error('[api/lyric]', err);
    return NextResponse.json({ lyric: null }, { status: 502 });
  }
}
