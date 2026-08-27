'use client';

/**
 * 登录页（颠覆性重构版）
 * React Bits Iridescence(ogl) 全屏幻彩背景 + ShinyText 标题
 * 表单保持 glass-panel 风格
 */
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ShinyText from '@/components/ui/reactbits/ShinyText';
import { useQualityTier } from '@/hooks/useQualityTier';

// ogl WebGL 背景：懒加载 + 禁 SSR
const Iridescence = dynamic(() => import('@/components/ui/reactbits/Iridescence'), { ssr: false });

export default function LoginPage() {
  const quality = useQualityTier();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 模拟登录/注册
    alert(isLogin ? '登录功能开发中...' : '注册功能开发中...');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* 幻彩背景（low 档降级为静态渐变） */}
      <div className="fixed inset-0 -z-10 opacity-40">
        {quality === 'low' ? (
          <div
            className="w-full h-full"
            style={{
              background:
                'radial-gradient(ellipse at 30% 20%, rgba(124,58,237,0.35) 0%, rgba(12,12,29,0) 60%), radial-gradient(ellipse at 70% 80%, rgba(236,72,153,0.25) 0%, rgba(12,12,29,0) 60%)',
            }}
          />
        ) : (
          <Iridescence color={[0.6, 0.35, 0.9]} speed={0.6} amplitude={0.15} mouseReact />
        )}
        <div className="absolute inset-0 bg-[#0a0a1a]/60" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              whileHover={{ rotate: 6, scale: 1.06 }}
              className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-purple-500/30"
            >
              雅
            </motion.div>
            <ShinyText
              text={isLogin ? '欢迎回来' : '加入雅枫'}
              speed={2.5}
              className="text-3xl font-bold"
              shineColor="#ffffff"
              color="#c4b5fd"
            />
            <p className="text-white/50 mt-2">
              {isLogin ? '登录你的雅枫音乐账号' : '创建账号，开启音乐之旅'}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="glass-panel p-8">
            {/* 切换标签 */}
            <div className="flex mb-6 p-1 rounded-xl bg-white/5">
              <button
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  isLogin ? 'bg-white/10 text-white' : 'text-white/50'
                }`}
                onClick={() => setIsLogin(true)}
              >
                登录
              </button>
              <button
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  !isLogin ? 'bg-white/10 text-white' : 'text-white/50'
                }`}
                onClick={() => setIsLogin(false)}
              >
                注册
              </button>
            </div>

            {/* 表单 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:shadow-[0_0_20px_rgba(168,85,247,0.15)] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:shadow-[0_0_20px_rgba(168,85,247,0.15)] outline-none transition-all"
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm text-white/60 mb-2">确认密码</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:shadow-[0_0_20px_rgba(168,85,247,0.15)] outline-none transition-all"
                  />
                </div>
              )}

              {isLogin && (
                <div className="flex justify-end">
                  <button type="button" className="text-sm text-white/50 hover:text-white transition-colors">
                    忘记密码？
                  </button>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-primary text-white font-semibold hover:opacity-90 transition-opacity shadow-glow"
              >
                {isLogin ? '登录' : '注册'}
              </motion.button>
            </form>

            {/* 分割线 */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/40">或</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* 第三方登录 */}
            <div className="space-y-3">
              <button className="w-full py-3 rounded-xl glass-panel text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                <span>🍎</span> 使用 Apple 登录
              </button>
              <button className="w-full py-3 rounded-xl glass-panel text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                <span>💬</span> 使用微信登录
              </button>
            </div>
          </div>
        </motion.div>

        {/* 返回首页 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-center mt-6"
        >
          <Link href="/" className="text-sm text-white/50 hover:text-white transition-colors">
            ← 返回首页
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
