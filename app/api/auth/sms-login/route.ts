import { NextRequest, NextResponse } from 'next/server';
import { loginCellphoneNetEase } from '@/lib/server/netEase';

/** 手机号 + 短信验证码登录，成功返回 { musicU } */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    phone?: string;
    captcha?: string;
    ctcode?: string;
  };
  const phone = body.phone?.trim() ?? '';
  const captcha = body.captcha?.trim() ?? '';
  if (!/^\d{5,15}$/.test(phone) || !/^\d{4,8}$/.test(captcha)) {
    return NextResponse.json({ message: '手机号或验证码格式不正确' }, { status: 400 });
  }
  try {
    const result = await loginCellphoneNetEase(phone, captcha, body.ctcode?.trim() || '86');
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/auth/sms-login]', err);
    return NextResponse.json({ message: '登录失败，请稍后重试' }, { status: 502 });
  }
}
