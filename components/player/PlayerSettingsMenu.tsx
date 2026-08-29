'use client';

/**
 * 播放器设置弹出菜单：音质档位 / 倍速 / 定时关闭
 */
import { motion } from 'framer-motion';
import { useMusicStore, QUALITY_OPTIONS, RATE_OPTIONS } from '@/lib/store';

interface PlayerSettingsMenuProps {
  onClose: () => void;
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}时${m}分` : `${m}分钟`;
}

export function PlayerSettingsMenu({ onClose }: PlayerSettingsMenuProps) {
  const quality = useMusicStore((s) => s.quality);
  const setQuality = useMusicStore((s) => s.setQuality);
  const playbackRate = useMusicStore((s) => s.playbackRate);
  const setPlaybackRate = useMusicStore((s) => s.setPlaybackRate);
  const sleepTimerEndsAt = useMusicStore((s) => s.sleepTimerEndsAt);
  const setSleepTimer = useMusicStore((s) => s.setSleepTimer);

  const remaining = sleepTimerEndsAt ? sleepTimerEndsAt - Date.now() : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="absolute bottom-full right-0 mb-3 w-72 rounded-2xl border border-white/10 shadow-2xl shadow-black/60 overflow-hidden"
      style={{ background: 'rgba(12,12,29,0.96)', backdropFilter: 'blur(24px)' }}
    >
      {/* 音质 */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <p className="text-xs text-white/40 mb-2">音质（无损/极高需版权与账号支持，失败自动回落）</p>
        <div className="grid grid-cols-4 gap-1.5">
          {QUALITY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setQuality(opt.id);
                onClose();
              }}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                quality === opt.id
                  ? 'bg-pri-mix-18 text-white border-pri-mix-45'
                  : 'text-white/50 hover:text-white border-white/10 hover:bg-white/5'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 倍速 */}
      <div className="px-4 pt-3 pb-3 border-b border-white/10">
        <p className="text-xs text-white/40 mb-2">倍速播放</p>
        <div className="grid grid-cols-6 gap-1.5">
          {RATE_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => {
                setPlaybackRate(r);
                onClose();
              }}
              className={`px-1 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                playbackRate === r
                  ? 'bg-acc-mix-20 text-white border-acc-mix-35'
                  : 'text-white/50 hover:text-white border-white/10 hover:bg-white/5'
              }`}
            >
              {r}x
            </button>
          ))}
        </div>
      </div>

      {/* 定时关闭 */}
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-white/40">定时关闭</p>
          {sleepTimerEndsAt && remaining > 0 && (
            <span className="text-xs text-emerald-300">剩余 {formatRemaining(remaining)}</span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {[15, 30, 60, 90].map((min) => (
            <button
              key={min}
              onClick={() => {
                setSleepTimer(min);
                onClose();
              }}
              className={`px-1 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                sleepTimerEndsAt && remaining > 0 && Math.abs(Math.ceil(remaining / 60000) - min) < 1
                  ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50'
                  : 'text-white/50 hover:text-white border-white/10 hover:bg-white/5'
              }`}
            >
              {min}分
            </button>
          ))}
          <button
            onClick={() => {
              setSleepTimer(null);
              onClose();
            }}
            className={`px-1 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
              !sleepTimerEndsAt
                ? 'bg-white/15 text-white border-white/30'
                : 'text-white/50 hover:text-white border-white/10 hover:bg-white/5'
            }`}
          >
            关闭
          </button>
        </div>
      </div>
    </motion.div>
  );
}
