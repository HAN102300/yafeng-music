import { NextRequest, NextResponse } from 'next/server';
import { sendSmsCaptchaNetEase } from '@/lib/server/netEase';

/** 发送登录短信验证码；被风控要求图形验证码时返回 needCaptcha + captchaImage */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    phone?: string;
    ctcode?: string;
    captcha?: string;
  };
  const phone = body.phone?.trim() ?? '';
  if (!/^\d{5,15}$/.test(phone)) {
    return NextResponse.json({ sent: false, message: '手机号格式不正确' }, { status: 400 });
  }
  try {
    const result = await sendSmsCaptchaNetEase(
      phone,
      body.ctcode?.trim() || '86',
      body.captcha?.trim() || undefined
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/auth/sms-send]', err);
    return NextResponse.json({ sent: false, message: '验证码发送失败，请稍后重试' }, { status: 502 });
  }
}
