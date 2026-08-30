import { NextResponse } from 'next/server';
import { getCaptchaImageNetEase } from '@/lib/server/netEase';

/** 获取图形验证码图（dataURL）；用于发送短信被风控要求时手动刷新 */
export async function GET() {
  try {
    const captcha = await getCaptchaImageNetEase();
    if (!captcha) {
      return NextResponse.json({ error: 'failed' }, { status: 502 });
    }
    return NextResponse.json({ captcha });
  } catch (err) {
    console.error('[api/auth/captcha-image]', err);
    return NextResponse.json({ error: 'failed' }, { status: 502 });
  }
}
