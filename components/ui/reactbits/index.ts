/**
 * React Bits 组件统一导出
 * 复制自 reactbits.dev (ts-tailwind)，按项目规范适配：
 * - motion/react → framer-motion
 * - WebGL（ogl）组件消费方须用 next/dynamic({ ssr: false }) 引入
 */

// WebGL 背景（须 dynamic ssr:false）
export { default as Aurora } from './Aurora';
export { default as Particles } from './Particles';
export { default as Threads } from './Threads';
export { default as Iridescence } from './Iridescence';

// 文本动效
export { default as SplitText } from './SplitText';
export { default as BlurText } from './BlurText';
export { default as ShinyText } from './ShinyText';
export { default as CountUp } from './CountUp';

// 卡片 / 列表
export { default as TiltedCard } from './TiltedCard';
export { default as SpotlightCard } from './SpotlightCard';
export { default as AnimatedList } from './AnimatedList';
export { default as ChromaGrid } from './ChromaGrid';
export type { ChromaItem } from './ChromaGrid';
