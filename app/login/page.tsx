'use client';

/**
 * 登录页 —— 多通道登录
 * - 扫码：weapi + type:1 网页通道（与 music.163.com 一致），诊断行实时显示上游状态
 * - 手机验证码：weapi 短信验证码登录；被风控要求图形验证码时展示图片兜底
 * - Cookie：粘贴浏览器中的 MUSIC_U，零风控依赖的兜底通道
 * 统一收口 loginWithMusicU 校验并本地保存，本站不存储任何账号数据。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import ShinyText from '@/components/ui/reactbits/ShinyText';
import { useQualityTier } from '@/hooks/useQualityTier';
import {
  createQrKey,
  checkQrKey,
  sendSmsCaptcha,
  loginCellphone,
  fetchCaptchaImage,
} from '@/lib/api';
import { loginWithMusicU, useNcmProfile } from '@/lib/ncmAuth';
import { toast } from '@/lib/toast';

// ogl WebGL 背景：懒加载 + 禁 SSR
const Iridescence = dynamic(() => import('@/components/ui/reactbits/Iridescence'), { ssr: false });

type QrState = 'loading' | 'waiting' | 'scanned' | 'success' | 'expired' | 'error';
type LoginMode = 'qr' | 'sms' | 'cookie';

const POLL_INTERVAL_MS = 3000;
const RESEND_SECONDS = 60;

export default function LoginPage() {
  const quality = useQualityTier();
  const router = useRouter();
  const profile = useNcmProfile();

  const [mode, setMode] = useState<LoginMode>('qr');

  // ---- 扫码通道 ----
  const [unikey, setUnikey] = useState<string | null>(null);
  const [qrState, setQrState] = useState<QrState>('loading');
  // 实时诊断：最近一次轮询的上游状态摘要（扫码排障用，直接显示在界面上）
  const [diag, setDiag] = useState<string>('');
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  // 生成代次令牌：StrictMode 双挂载/手动刷新时作废旧轮询，防止双 interval 与旧 key 覆盖状态
  const genRef = useRef(0);

  // ---- 手机验证码通道 ----
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [imgCaptcha, setImgCaptcha] = useState('');
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [smsSending, setSmsSending] = useState(false);
  const [smsLogging, setSmsLogging] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [smsMsg, setSmsMsg] = useState('');

  // ---- Cookie 通道 ----
  const [cookieInput, setCookieInput] = useState('');
  const [cookieBusy, setCookieBusy] = useState(false);
  const [cookieMsg, setCookieMsg] = useState('');

  /** 生成二维码并开始轮询 */
  const startQr = useCallback(async () => {
    clearInterval(pollRef.current);
    const gen = ++genRef.current;
    setQrState('loading');
    setUnikey(null);
    setDiag('');
    try {
      const key = await createQrKey();
      if (gen !== genRef.current) return;
      setUnikey(key);
      setQrState('waiting');

      pollRef.current = setInterval(async () => {
        if (gen !== genRef.current) {
          clearInterval(pollRef.current);
          return;
        }
        try {
          const res = await checkQrKey(key);
          setDiag(`code=${res.code}${res.musicU ? ' · 已取到登录凭证' : ''}${res.dbg ? ` · ${res.dbg.slice(0, 80)}` : ''}`);
          if (res.code === 802) {
            setQrState('scanned');
          } else if (res.code === 803 && res.musicU) {
            clearInterval(pollRef.current);
            setQrState('success');
            const account = await loginWithMusicU(res.musicU);
            if (account) {
              toast(`欢迎回来，${account.nickname}`, 'success');
              setTimeout(() => router.push('/'), 800);
            } else {
              setQrState('error');
              toast('登录态校验失败，请重新扫码', 'error');
            }
          } else if (res.code === 803) {
            // 授权成功但未取到登录 cookie：停止轮询，提示重试而非卡死
            clearInterval(pollRef.current);
            console.warn('[qr] 803 未携带 MUSIC_U，诊断:', res.dbg);
            setQrState('error');
            toast('登录成功但登录态获取失败，请点击刷新二维码重试', 'error');
          } else if (res.code === 800) {
            clearInterval(pollRef.current);
            setQrState('expired');
          } else if (res.code === 8821) {
            // 网易风控拦截（安全环境风险）：停止轮询，给出明确指引而非无限「已扫码」
            clearInterval(pollRef.current);
            console.warn('[qr] 8821 风控拦截，诊断:', res.dbg);
            setQrState('error');
            toast('网易云风控拦截了本次扫码，可改用「手机验证码」或「Cookie」通道登录', 'error');
          }
        } catch {
          /* 单次轮询失败忽略，下一轮继续 */
        }
      }, POLL_INTERVAL_MS);
    } catch {
      if (gen === genRef.current) setQrState('error');
    }
  }, [router]);

  useEffect(() => {
    // 已登录则无需扫码
    if (!profile) startQr();
    else setQrState('success');
    return () => clearInterval(pollRef.current);
  }, [profile, startQr]);

  // 重发倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const validPhone = /^1\d{10}$/.test(phone);

  /** 发送短信验证码（带上图形验证码结果） */
  const handleSendSms = async () => {
    if (!validPhone) {
      setSmsMsg('请输入正确的 11 位手机号');
      return;
    }
    setSmsSending(true);
    setSmsMsg('');
    try {
      const res = await sendSmsCaptcha(phone, imgCaptcha.trim() || undefined);
      if (res.sent) {
        setCountdown(RESEND_SECONDS);
        setCaptchaImage(null);
        setImgCaptcha('');
        setSmsMsg('验证码已发送，请查收短信');
        toast('验证码已发送', 'success');
      } else if (res.needCaptcha && res.captchaImage) {
        setCaptchaImage(res.captchaImage);
        setSmsMsg('请先输入图形验证码，再点「获取验证码」');
      } else {
        setSmsMsg(res.message ?? '发送失败，请稍后重试');
      }
    } catch {
      setSmsMsg('发送失败，请稍后重试');
    } finally {
      setSmsSending(false);
    }
  };

  /** 手动刷新图形验证码图 */
  const refreshCaptchaImage = async () => {
    const img = await fetchCaptchaImage();
    if (img) setCaptchaImage(img);
    else setSmsMsg('图形验证码获取失败，请稍后重试');
  };

  /** 手机验证码登录 */
  const handleSmsLogin = async () => {
    if (!validPhone) {
      setSmsMsg('请输入正确的 11 位手机号');
      return;
    }
    if (!/^\d{4,8}$/.test(smsCode)) {
      setSmsMsg('请输入收到的短信验证码');
      return;
    }
    setSmsLogging(true);
    setSmsMsg('');
    try {
      const res = await loginCellphone(phone, smsCode);
      if (res.musicU) {
        const account = await loginWithMusicU(res.musicU);
        if (account) {
          toast(`欢迎回来，${account.nickname}`, 'success');
          setTimeout(() => router.push('/'), 800);
        } else {
          setSmsMsg('登录态校验失败，请重试');
        }
      } else {
        setSmsMsg(res.message ?? '登录失败，请检查手机号与验证码');
      }
    } catch {
      setSmsMsg('登录失败，请稍后重试');
    } finally {
      setSmsLogging(false);
    }
  };

  /** Cookie 粘贴登录：兼容完整 Cookie 串或裸 MUSIC_U 值 */
  const handleCookieLogin = async () => {
    const raw = cookieInput.trim();
    if (!raw) {
      setCookieMsg('请粘贴 MUSIC_U 或包含它的完整 Cookie');
      return;
    }
    const musicU =
      /MUSIC_U=([^;\s"']+)/.exec(raw)?.[1] ??
      (raw.length >= 32 && !/\s/.test(raw) ? raw : '');
    if (!musicU) {
      setCookieMsg('未识别到 MUSIC_U，请重新复制');
      return;
    }
    setCookieBusy(true);
    setCookieMsg('');
    try {
      const account = await loginWithMusicU(musicU);
      if (account) {
        toast(`欢迎回来，${account.nickname}`, 'success');
        setTimeout(() => router.push('/'), 800);
      } else {
        setCookieMsg('Cookie 无效或已过期，请重新复制');
      }
    } catch {
      setCookieMsg('登录失败，请稍后重试');
    } finally {
      setCookieBusy(false);
    }
  };

  const stateText: Record<QrState, string> = {
    loading: '正在生成二维码...',
    waiting: '打开 网易云音乐 App 扫码登录',
    scanned: '✓ 已扫码，请在手机上确认登录',
    success: '登录成功，正在跳转...',
    expired: '二维码已过期',
    error: '扫码通道暂不可用，试试其他登录方式',
  };

  const inputCls =
    'flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 outline-none focus:border-acc/50 transition-colors';

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4">
      {/* Iridescence 背景（low 档降级静态渐变） */}
      <div className="absolute inset-0 -z-10">
        {quality === 'low' ? (
          <div
            className="w-full h-full"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(82,39,255,0.35) 0%, rgba(12,12,29,0) 65%)',
            }}
          />
        ) : (
          <Iridescence color={[1, 0.5, 0.85]} speed={1.2} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-dark-base)] via-transparent to-[var(--color-dark-base)]/60" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel rounded-3xl p-8 md:p-10 w-full max-w-md text-center relative"
      >
        <ShinyText text="登录雅枫音乐" speed={3} className="text-3xl font-bold" shineColor="#e9d5ff" color="#a78bfa" />
        <p className="text-white/50 text-sm mt-2 mb-6">多通道登录 · 解锁每日推荐、私人FM、我的歌单</p>

        {profile ? (
          <div className="py-8">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-white mb-1">已登录：{profile.nickname}</h2>
            <p className="text-white/40 text-sm mb-8">享受你的音乐时光</p>
            <button
              onClick={() => router.push('/')}
              className="px-8 py-3 rounded-full bg-gradient-primary text-white on-accent font-medium hover:opacity-90 transition-opacity"
            >
              回到首页
            </button>
          </div>
        ) : (
          <>
            {/* 登录方式切换 */}
            <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10 mb-6">
              {(
                [
                  ['qr', '扫码登录'],
                  ['sms', '手机验证码'],
                  ['cookie', 'Cookie'],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 px-2 py-1.5 rounded-full text-xs font-medium transition-all ${
                    mode === m ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === 'qr' && (
              <>
                {/* 二维码区域 */}
                <div className="relative w-52 h-52 mx-auto mb-5">
                  <AnimatePresence mode="wait">
                    {unikey && (qrState === 'waiting' || qrState === 'scanned') ? (
                      <motion.div
                        key="qr"
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        className="w-full h-full bg-white rounded-2xl p-3 flex items-center justify-center"
                      >
                        {/* App 只识别官方登录 URL 格式，裸 unikey 会提示"不支持的类型" */}
                        <QRCodeSVG
                          value={`https://music.163.com/login?codekey=${unikey}`}
                          size={184}
                          level="M"
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={qrState}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full h-full rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3"
                      >
                        {qrState === 'loading' && (
                          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-acc animate-spin" />
                        )}
                        {qrState === 'success' && <div className="text-5xl">🎉</div>}
                        {qrState === 'expired' && <div className="text-5xl">⏰</div>}
                        {qrState === 'error' && <div className="text-5xl">📡</div>}
                        <p className="text-xs text-white/40 px-6">{stateText[qrState]}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 已扫遮罩 */}
                  {qrState === 'scanned' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 rounded-2xl bg-[#0a0a1a]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2"
                    >
                      <div className="text-4xl">📱</div>
                      <p className="text-sm text-emerald-300">扫码成功</p>
                    </motion.div>
                  )}
                </div>

                <p className={`text-sm mb-2 ${qrState === 'scanned' ? 'text-emerald-300' : 'text-white/50'}`}>
                  {stateText[qrState]}
                </p>
                {diag && qrState !== 'success' && (
                  <p className="text-[10px] text-white/25 mb-4 font-mono truncate max-w-xs mx-auto" title={diag}>
                    {diag}
                  </p>
                )}
                {qrState !== 'scanned' && <div className="mb-4" />}

                {(qrState === 'expired' || qrState === 'error') && (
                  <button
                    onClick={startQr}
                    className="px-8 py-3 rounded-full bg-gradient-primary text-white on-accent font-medium hover:opacity-90 transition-opacity"
                  >
                    刷新二维码
                  </button>
                )}
              </>
            )}

            {mode === 'sms' && (
              <div className="space-y-3 text-left">
                {/* 手机号 */}
                <div className="flex items-center gap-2">
                  <span className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 flex-shrink-0">
                    +86
                  </span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    onKeyDown={(e) => e.key === 'Enter' && smsCode && handleSmsLogin()}
                    placeholder="网易云音乐绑定手机号"
                    inputMode="numeric"
                    className={inputCls}
                  />
                </div>

                {/* 图形验证码（风控要求时出现） */}
                {captchaImage && (
                  <div className="flex items-center gap-2">
                    <input
                      value={imgCaptcha}
                      onChange={(e) => setImgCaptcha(e.target.value)}
                      placeholder="图形验证码"
                      className={inputCls}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={captchaImage}
                      alt="图形验证码"
                      title="看不清？点击刷新"
                      onClick={refreshCaptchaImage}
                      className="h-10 rounded-lg border border-white/10 cursor-pointer flex-shrink-0"
                    />
                  </div>
                )}

                {/* 短信验证码 + 获取按钮 */}
                <div className="flex items-center gap-2">
                  <input
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSmsLogin()}
                    placeholder="短信验证码"
                    inputMode="numeric"
                    className={inputCls}
                  />
                  <button
                    onClick={handleSendSms}
                    disabled={smsSending || countdown > 0}
                    className="px-3 py-2.5 rounded-xl text-xs font-medium flex-shrink-0 border transition-all bg-pri-mix-10 border-pri-mix-25 text-acc hover:bg-pri-mix-18 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {countdown > 0 ? `${countdown}s 后重发` : smsSending ? '发送中...' : '获取验证码'}
                  </button>
                </div>

                <button
                  onClick={handleSmsLogin}
                  disabled={smsLogging}
                  className="w-full py-3 rounded-full bg-gradient-primary text-white on-accent font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {smsLogging ? '登录中...' : '登录'}
                </button>

                {smsMsg && <p className="text-xs text-white/45 text-center">{smsMsg}</p>}
              </div>
            )}

            {mode === 'cookie' && (
              <div className="space-y-3 text-left">
                <input
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCookieLogin()}
                  placeholder="粘贴 MUSIC_U=... 或完整 Cookie"
                  className={`${inputCls} w-full font-mono`}
                />
                <button
                  onClick={handleCookieLogin}
                  disabled={cookieBusy}
                  className="w-full py-3 rounded-full bg-gradient-primary text-white on-accent font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {cookieBusy ? '校验中...' : '登录'}
                </button>
                <p className="text-[11px] text-white/30 leading-relaxed text-center">
                  获取方式：浏览器打开 music.163.com 并登录 → F12 → 应用/Application → Cookie →
                  music.163.com → 复制 MUSIC_U 的值粘贴到上方。
                  <br />
                  该通道不经过扫码风控，最稳定。
                </p>
                {cookieMsg && <p className="text-xs text-white/45 text-center">{cookieMsg}</p>}
              </div>
            )}
          </>
        )}

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-white/30 leading-relaxed">
            使用你的网易云音乐账号登录本站，扫码/验证码/Cookie 三选一。
            <br />
            登录态仅保存在本地浏览器，本站不存储任何账号数据。
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            暂不登录，先去逛逛 →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
