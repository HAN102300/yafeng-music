import { NextResponse } from 'next/server';
import { getSearchHotNetEase } from '@/lib/server/netEase';

export async function GET() {
  try {
    const keywords = await getSearchHotNetEase();
    return NextResponse.json({ keywords });
  } catch (err) {
    console.error('[api/search-hot]', err);
    return NextResponse.json({ keywords: [] }, { status: 502 });
  }
}
