import { NextResponse } from 'next/server';
import { getToplistNetEase } from '@/lib/server/netEase';

export async function GET() {
  try {
    const toplists = await getToplistNetEase();
    return NextResponse.json({ toplists });
  } catch (err) {
    console.error('[api/toplist]', err);
    return NextResponse.json({ toplists: [] }, { status: 502 });
  }
}
