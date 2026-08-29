import { NextRequest, NextResponse } from 'next/server';
import { getSongUrlNetEase, type SongQuality } from '@/lib/server/netEase';
import { numParam } from '@/lib/server/auth';

const LEVELS: SongQuality[] = ['standard', 'higher', 'exhigh', 'lossless', 'hires'];

export async function GET(request: NextRequest) {
  const id = numParam(request, 'id', 0);
  const levelParam = request.nextUrl.searchParams.get('level') as SongQuality | null;
  const level = levelParam && LEVELS.includes(levelParam) ? levelParam : 'standard';
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 });
  }
  try {
    const result = await getSongUrlNetEase(id, level);
    if (!result) {
      return NextResponse.json({ error: 'no url' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/song-url]', err);
    return NextResponse.json({ error: 'failed' }, { status: 502 });
  }
}
