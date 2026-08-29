'use client';

/**
 * 统一页面标题：主题渐变条 + 白色标题 + 副标题 + 右侧动作区
 * 替代原先各页五颜六色的 ShinyText 页头，保证全站风格一致且跟随主题。
 */
import { motion } from 'framer-motion';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** 标题字级（默认页面级大标题） */
  center?: boolean;
}

export function PageHeader({ title, subtitle, action, center = false }: PageHeaderProps) {
  if (center) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
        <div className="inline-flex items-center gap-3">
          <span className="section-bar" />
          <h1 className="text-3xl md:text-4xl font-bold text-white">{title}</h1>
          <span className="section-bar" />
        </div>
        {subtitle && <p className="text-white/40 mt-2 text-sm">{subtitle}</p>}
        {action}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 flex items-end justify-between flex-wrap gap-3"
    >
      <div className="flex items-center gap-3">
        <span className="section-bar" style={{ height: '2.4em' }} />
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-white/50 mt-1.5 text-sm">{subtitle}</p>}
        </div>
      </div>
      {action}
    </motion.div>
  );
}
