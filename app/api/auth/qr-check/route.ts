import { NextRequest, NextResponse } from 'next/server';
import { checkQrKeyNetEase } from '@/lib/server/netEase';

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')?.trim();
  if (!key) {
    return NextResponse.json({ error: 'missing key' }, { status: 400 });
  }
  try {
    const result = await checkQrKeyNetEase(key);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/auth/qr-check]', err);
    return NextResponse.json({ code: 801 });
  }
}
