'use client';

/**
 * 登录页（网易云扫码登录版）
 * Iridescence(ogl) 全屏幻彩背景 + 网易云真实扫码登录：
 * unikey 二维码 → 3s 轮询（801等待/802已扫/803成功/800过期自动刷新）→ MUSIC_U 本地保存。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import ShinyText from '@/components/ui/reactbits/ShinyText';
import { useQualityTier } from '@/hooks/useQualityTier';
import { createQrKey, checkQrKey } from '@/lib/api';
import { loginWithMusicU, useNcmProfile } from '@/lib/ncmAuth';
import { toast } from '@/lib/toast';

// ogl WebGL 背景：懒加载 + 禁 SSR
const Iridescence = dynamic(() => import('@/components/ui/reactbits/Iridescence'), { ssr: false });

type QrState = 'loading' | 'waiting' | 'scanned' | 'success' | 'expired' | 'error';

const POLL_INTERVAL_MS = 3000;

export default function LoginPage() {
  const quality = useQualityTier();
  const router = useRouter();
  const profile = useNcmProfile();

  const [unikey, setUnikey] = useState<string | null>(null);
  const [qrState, setQrState] = useState<QrState>('loading');
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  /** 生成二维码并开始轮询 */
  const startQr = useCallback(async () => {
    clearInterval(pollRef.current);
    setQrState('loading');
    setUnikey(null);
    try {
      const key = await createQrKey();
      setUnikey(key);
      setQrState('waiting');

      pollRef.current = setInterval(async () => {
        try {
          const res = await checkQrKey(key);
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
          } else if (res.code === 800) {
            clearInterval(pollRef.current);
            setQrState('expired');
          }
        } catch {
          /* 单次轮询失败忽略，下一轮继续 */
        }
      }, POLL_INTERVAL_MS);
    } catch {
      setQrState('error');
    }
  }, [router]);

  useEffect(() => {
    // 已登录则无需扫码
    if (!profile) startQr();
    else setQrState('success');
    return () => clearInterval(pollRef.current);
  }, [profile, startQr]);

  const stateText: Record<QrState, string> = {
    loading: '正在生成二维码...',
    waiting: '打开 网易云音乐 App 扫码登录',
    scanned: '✓ 已扫码，请在手机上确认登录',
    success: '登录成功，正在跳转...',
    expired: '二维码已过期',
    error: '登录服务暂不可用，请稍后重试',
  };

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
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-transparent to-[#0a0a1a]/60" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel rounded-3xl p-8 md:p-10 w-full max-w-md text-center relative"
      >
        <ShinyText text="登录雅枫音乐" speed={3} className="text-3xl font-bold" shineColor="#e9d5ff" color="#a78bfa" />
        <p className="text-white/50 text-sm mt-2 mb-8">扫码登录后解锁每日推荐、私人FM、我的歌单</p>

        {profile ? (
          <div className="py-8">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-white mb-1">已登录：{profile.nickname}</h2>
            <p className="text-white/40 text-sm mb-8">享受你的音乐时光</p>
            <button
              onClick={() => router.push('/')}
              className="px-8 py-3 rounded-full bg-gradient-primary text-white font-medium hover:opacity-90 transition-opacity"
            >
              回到首页
            </button>
          </div>
        ) : (
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
                    <QRCodeSVG value={unikey} size={184} level="M" />
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

            <p className={`text-sm mb-6 ${qrState === 'scanned' ? 'text-emerald-300' : 'text-white/50'}`}>
              {stateText[qrState]}
            </p>

            {(qrState === 'expired' || qrState === 'error') && (
              <button
                onClick={startQr}
                className="px-8 py-3 rounded-full bg-gradient-primary text-white font-medium hover:opacity-90 transition-opacity"
              >
                刷新二维码
              </button>
            )}
          </>
        )}

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-white/30 leading-relaxed">
            扫码即代表你同意使用网易云音乐账号登录本站。
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
