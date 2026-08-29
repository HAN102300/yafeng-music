import { NextRequest, NextResponse } from 'next/server';
import { getAccountNetEase } from '@/lib/server/netEase';
import { musicUFromRequest } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  try {
    const account = await getAccountNetEase(musicUFromRequest(request));
    return NextResponse.json({ account });
  } catch (err) {
    console.error('[api/account]', err);
    return NextResponse.json({ account: null }, { status: 502 });
  }
}
