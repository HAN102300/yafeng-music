import { NextResponse } from 'next/server';
import { getPlaylistCatalogueNetEase } from '@/lib/server/netEase';

export async function GET() {
  try {
    const categories = await getPlaylistCatalogueNetEase();
    return NextResponse.json({ categories });
  } catch (err) {
    console.error('[api/playlist-catalogue]', err);
    return NextResponse.json({ categories: [] }, { status: 502 });
  }
}
