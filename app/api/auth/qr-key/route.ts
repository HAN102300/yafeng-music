import { NextResponse } from 'next/server';
import { createQrKeyNetEase } from '@/lib/server/netEase';

export async function GET() {
  try {
    const unikey = await createQrKeyNetEase();
    if (!unikey) {
      return NextResponse.json({ error: 'failed' }, { status: 502 });
    }
    return NextResponse.json({ unikey });
  } catch (err) {
    console.error('[api/auth/qr-key]', err);
    return NextResponse.json({ error: 'failed' }, { status: 502 });
  }
}
