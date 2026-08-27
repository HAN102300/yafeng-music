import { NextRequest, NextResponse } from 'next/server';
import { searchNetEase } from '@/lib/server/netEase';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '30');
  if (!q) {
    return NextResponse.json({ songs: [] });
  }
  try {
    const songs = await searchNetEase(q, Math.min(50, Math.max(1, limit)));
    return NextResponse.json({ songs });
  } catch (err) {
    console.error('[api/search]', err);
    return NextResponse.json({ songs: [] }, { status: 502 });
  }
}
