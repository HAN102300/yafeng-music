# 雅枫音乐网站重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将雅枫音乐静态网站重构为基于 Next.js 的现代化沉浸式音乐平台，具备 3D 音频可视化、平滑滚动动画和渐变艺术风格。

**Architecture:** Next.js App Router + TypeScript 全栈架构，Three.js 实现 3D 粒子音频可视化背景，GSAP + Lenis 实现滚动动画和丝滑交互，Zustand 管理全局音乐状态，Tailwind CSS 实现渐变艺术风格。

**Tech Stack:** Next.js 15, TypeScript, Three.js, GSAP, Lenis, Tailwind CSS, Zustand

---

## 文件结构

```
ya-feng-music/
├── app/
│   ├── layout.tsx              # 根布局：导航栏 + 3D背景 + 底部播放栏
│   ├── page.tsx                # 首页：Hero + 推荐内容
│   ├── globals.css             # 全局样式 + Tailwind + 设计令牌
│   ├── songlist/page.tsx       # 歌单页
│   ├── singer/page.tsx         # 歌手页
│   ├── musictop/page.tsx       # 排行榜页
│   └── login/page.tsx          # 登录页
├── components/
│   ├── three/
│   │   ├── AudioVisualizer.tsx     # Three.js 3D 音频可视化主组件
│   │   ├── ParticleField.tsx       # 粒子场渲染组件
│   │   └── shaders/
│   │       ├── vertex.glsl         # 顶点着色器
│   │       └── fragment.glsl       # 片段着色器
│   ├── ui/
│   │   ├── Navbar.tsx              # 导航栏（玻璃拟态）
│   │   ├── MusicCard.tsx           # 音乐卡片（3D 倾斜 + 悬停发光）
│   │   ├── PlayerBar.tsx           # 底部播放控制栏
│   │   └── GlassPanel.tsx          # 玻璃拟态面板
│   └── animations/
│       ├── ScrollReveal.tsx        # 滚动入场动画包装器
│       └── HoverGlow.tsx           # 悬停发光效果
├── lib/
│   ├── store.ts                # Zustand 音乐状态管理
│   ├── audio.ts                # Web Audio API 分析工具
│   └── data.ts                 # 歌曲/歌单/歌手数据
├── public/
│   ├── media/                  # 音频文件
│   └── images/                 # 图片资源
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `.gitignore`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "ya-feng-music",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "three": "^0.171.0",
    "@types/three": "^0.171.0",
    "gsap": "^3.12.5",
    "@studio-freight/lenis": "^1.0.42",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "@types/node": "^22.10.1",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.1",
    "tailwindcss": "^3.4.16",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.16.0",
    "eslint-config-next": "^15.1.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: 创建 next.config.ts**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 4: 创建 tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#667eea',
          light: '#764ba2',
        },
        accent: {
          DEFAULT: '#00f5a0',
          blue: '#00d9f5',
        },
        neon: {
          pink: '#f093fb',
          red: '#f5576c',
        },
        dark: {
          base: '#0c0c1d',
          mid: '#1a1a3e',
          light: '#2d1b4e',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b4e 100%)',
        'gradient-accent': 'linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)',
      },
      backdropBlur: {
        glass: '20px',
      },
      borderRadius: {
        glass: '20px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.37)',
        'glow': '0 0 20px rgba(0, 245, 160, 0.3)',
        'glow-pink': '0 0 20px rgba(240, 147, 251, 0.3)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: 创建 postcss.config.mjs**

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

- [ ] **Step 6: 创建 .gitignore**

```
# dependencies
/node_modules
/.pnp
.pnp.js

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# typescript
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 7: 安装依赖**

Run: `cd "e:\FrontEnd-project\YaFeng Music" && npm install`
Expected: 安装完成，无错误

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs .gitignore
git commit -m "chore: initialize Next.js project with TypeScript and Tailwind CSS"
```

---

## Task 2: 全局样式与设计令牌

**Files:**
- Create: `app/globals.css`

- [ ] **Step 1: 创建全局样式文件**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-secondary: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --gradient-dark: linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b4e 100%);
  --gradient-accent: linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%);
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: blur(20px);
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-accent: #00f5a0;
  --glow-accent: 0 0 20px rgba(0, 245, 160, 0.3);
  --glow-pink: 0 0 20px rgba(240, 147, 251, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--gradient-dark);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}

@layer components {
  .glass-panel {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .glass-card:hover {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: var(--glow-accent);
    transform: translateY(-4px);
  }

  .glass-navbar {
    background: rgba(12, 12, 29, 0.8);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .glass-player {
    background: rgba(12, 12, 29, 0.9);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
}

.text-gradient {
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.text-gradient-primary {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.glow-accent {
  box-shadow: var(--glow-accent);
}

.glow-pink {
  box-shadow: var(--glow-pink);
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(12, 12, 29, 0.5);
}

::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.5);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(102, 126, 234, 0.8);
}

::selection {
  background: rgba(0, 245, 160, 0.3);
  color: #ffffff;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "style: add global CSS with design tokens and glassmorphism utilities"
```

---

## Task 3: 数据层与状态管理

**Files:**
- Create: `lib/data.ts`
- Create: `lib/store.ts`
- Create: `lib/audio.ts`

- [ ] **Step 1: 创建数据文件**

```typescript
// lib/data.ts
export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
  audioUrl: string;
}

export interface Playlist {
  id: string;
  name: string;
  cover: string;
  description: string;
  songIds: string[];
}

export interface Singer {
  id: string;
  name: string;
  avatar: string;
  genre: string;
  songIds: string[];
}

export const songs: Song[] = [
  {
    id: '1',
    title: '夜曲',
    artist: '周杰伦',
    album: '十一月的萧邦',
    cover: '/images/cover1.jpg',
    duration: 237,
    audioUrl: '/media/song1.mp3',
  },
  {
    id: '2',
    title: '稻香',
    artist: '周杰伦',
    album: '魔杰座',
    cover: '/images/cover2.jpg',
    duration: 223,
    audioUrl: '/media/song2.mp3',
  },
  {
    id: '3',
    title: '晴天',
    artist: '周杰伦',
    album: '叶惠美',
    cover: '/images/cover3.jpg',
    duration: 269,
    audioUrl: '/media/song3.mp3',
  },
  {
    id: '4',
    title: '七里香',
    artist: '周杰伦',
    album: '七里香',
    cover: '/images/cover4.jpg',
    duration: 299,
    audioUrl: '/media/song4.mp3',
  },
  {
    id: '5',
    title: '告白气球',
    artist: '周杰伦',
    album: '周杰伦的床边故事',
    cover: '/images/cover5.jpg',
    duration: 215,
    audioUrl: '/media/song5.mp3',
  },
  {
    id: '6',
    title: '等你下课',
    artist: '周杰伦',
    album: '等你下课',
    cover: '/images/cover6.jpg',
    duration: 273,
    audioUrl: '/media/song6.mp3',
  },
];

export const playlists: Playlist[] = [
  {
    id: '1',
    name: '华语经典',
    cover: '/images/playlist1.jpg',
    description: '那些年我们一起听过的华语金曲',
    songIds: ['1', '2', '3', '4'],
  },
  {
    id: '2',
    name: '深夜电台',
    cover: '/images/playlist2.jpg',
    description: '适合深夜独自聆听的温暖旋律',
    songIds: ['1', '3', '5'],
  },
  {
    id: '3',
    name: '青春记忆',
    cover: '/images/playlist3.jpg',
    description: '致我们终将逝去的青春',
    songIds: ['2', '4', '6'],
  },
];

export const singers: Singer[] = [
  {
    id: '1',
    name: '周杰伦',
    avatar: '/images/singer1.jpg',
    genre: '华语流行',
    songIds: ['1', '2', '3', '4', '5', '6'],
  },
  {
    id: '2',
    name: '林俊杰',
    avatar: '/images/singer2.jpg',
    genre: '华语流行',
    songIds: [],
  },
  {
    id: '3',
    name: '邓紫棋',
    avatar: '/images/singer3.jpg',
    genre: '华语流行',
    songIds: [],
  },
];
```

- [ ] **Step 2: 创建 Zustand Store**

```typescript
// lib/store.ts
import { create } from 'zustand';
import { Song, songs } from './data';

interface MusicStore {
  currentSong: Song | null;
  isPlaying: boolean;
  playlist: Song[];
  volume: number;
  progress: number;
  currentTime: number;
  duration: number;
  play: (song: Song) => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  setProgress: (p: number) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setPlaylist: (songs: Song[]) => void;
}

export const useMusicStore = create<MusicStore>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  playlist: songs,
  volume: 0.7,
  progress: 0,
  currentTime: 0,
  duration: 0,

  play: (song: Song) => {
    set({ currentSong: song, isPlaying: true, progress: 0, currentTime: 0 });
  },

  pause: () => set({ isPlaying: false }),

  togglePlay: () => {
    const { isPlaying } = get();
    set({ isPlaying: !isPlaying });
  },

  next: () => {
    const { playlist, currentSong } = get();
    if (!currentSong || playlist.length === 0) return;
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    set({ currentSong: playlist[nextIndex], progress: 0, currentTime: 0 });
  },

  prev: () => {
    const { playlist, currentSong } = get();
    if (!currentSong || playlist.length === 0) return;
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    set({ currentSong: playlist[prevIndex], progress: 0, currentTime: 0 });
  },

  setVolume: (v: number) => set({ volume: Math.max(0, Math.min(1, v)) }),
  setProgress: (p: number) => set({ progress: p }),
  setCurrentTime: (t: number) => set({ currentTime: t }),
  setDuration: (d: number) => set({ duration: d }),
  setPlaylist: (songs: Song[]) => set({ playlist: songs }),
}));
```

- [ ] **Step 3: 创建音频分析工具**

```typescript
// lib/audio.ts
export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private audioElement: HTMLAudioElement | null = null;

  init(audioElement: HTMLAudioElement) {
    if (this.audioElement === audioElement) return;
    
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    
    this.source = this.audioContext.createMediaElementSource(audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.audioElement = audioElement;
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyser || !this.dataArray) return new Uint8Array(0);
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  getAverageFrequency(): number {
    const data = this.getFrequencyData();
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length / 255;
  }

  getLowFrequency(): number {
    const data = this.getFrequencyData();
    if (data.length === 0) return 0;
    const slice = data.slice(0, Math.floor(data.length * 0.3));
    const sum = slice.reduce((acc, val) => acc + val, 0);
    return sum / slice.length / 255;
  }

  getMidFrequency(): number {
    const data = this.getFrequencyData();
    if (data.length === 0) return 0;
    const start = Math.floor(data.length * 0.3);
    const end = Math.floor(data.length * 0.7);
    const slice = data.slice(start, end);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    return sum / slice.length / 255;
  }

  getHighFrequency(): number {
    const data = this.getFrequencyData();
    if (data.length === 0) return 0;
    const slice = data.slice(Math.floor(data.length * 0.7));
    const sum = slice.reduce((acc, val) => acc + val, 0);
    return sum / slice.length / 255;
  }

  dispose() {
    if (this.source) this.source.disconnect();
    if (this.audioContext) this.audioContext.close();
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.dataArray = null;
    this.audioElement = null;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/data.ts lib/store.ts lib/audio.ts
git commit -m "feat: add data layer, Zustand store, and audio analyzer utility"
```

---

## Task 4: 3D 音频可视化组件

**Files:**
- Create: `components/three/ParticleField.tsx`
- Create: `components/three/AudioVisualizer.tsx`

- [ ] **Step 1: 创建粒子场组件**

```typescript
// components/three/ParticleField.tsx
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleFieldProps {
  count?: number;
  frequency?: number;
  lowFreq?: number;
  highFreq?: number;
  mouse?: { x: number; y: number };
}

export default function ParticleField({
  count = 5000,
  frequency = 0,
  lowFreq = 0,
  highFreq = 0,
  mouse = { x: 0, y: 0 },
}: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, scales, randomness } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const randomness = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = Math.random() * 5 + 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi) * 0.5;
      scales[i] = Math.random() * 2 + 0.5;
      randomness[i3] = (Math.random() - 0.5) * 0.5;
      randomness[i3 + 1] = (Math.random() - 0.5) * 0.5;
      randomness[i3 + 2] = (Math.random() - 0.5) * 0.5;
    }

    return { positions, scales, randomness };
  }, [count]);

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    materialRef.current.uniforms.uFrequency.value = frequency;
    materialRef.current.uniforms.uLowFreq.value = lowFreq;
    materialRef.current.uniforms.uHighFreq.value = highFreq;
    materialRef.current.uniforms.uMouse.value.set(mouse.x, mouse.y);
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFrequency: { value: 0 },
      uLowFreq: { value: 0 },
      uHighFreq: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    }),
    []
  );

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aScale" count={count} array={scales} itemSize={1} />
        <bufferAttribute attach="attributes-aRandomness" count={count} array={randomness} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          uniform float uFrequency;
          uniform float uLowFreq;
          uniform float uHighFreq;
          uniform vec2 uMouse;
          attribute float aScale;
          attribute vec3 aRandomness;
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vec3 pos = position;
            float dist = length(pos);
            float expansion = 1.0 + uLowFreq * 0.5;
            pos.xy *= expansion;
            float rotation = uHighFreq * 0.02;
            float s = sin(rotation);
            float c = cos(rotation);
            pos.xy = mat2(c, -s, s, c) * pos.xy;
            vec2 mouseInfluence = uMouse * 0.1;
            pos.xy += mouseInfluence * dist * 0.1;
            pos += aRandomness * uFrequency * 0.3;
            vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
            vec4 viewPosition = viewMatrix * modelPosition;
            vec4 projectedPosition = projectionMatrix * viewPosition;
            gl_Position = projectedPosition;
            gl_PointSize = aScale * (1.0 + uFrequency * 2.0);
            gl_PointSize *= (1.0 / -viewPosition.z);
            float colorMix = (dist / 5.0) + uFrequency * 0.5;
            vColor = mix(vec3(0.0, 0.96, 0.63), vec3(0.94, 0.58, 0.98), colorMix);
            vAlpha = 0.6 + uFrequency * 0.4;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
            alpha *= vAlpha;
            float glow = 1.0 - dist * 2.0;
            glow = pow(glow, 1.5);
            vec3 finalColor = vColor * (0.8 + glow * 0.4);
            gl_FragColor = vec4(finalColor, alpha);
          }
        `}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
```

- [ ] **Step 2: 创建 3D 音频可视化主组件**

```typescript
// components/three/AudioVisualizer.tsx
'use client';

import { useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useMusicStore } from '@/lib/store';
import { AudioAnalyzer } from '@/lib/audio';
import ParticleField from './ParticleField';

function SceneContent({ analyzer, isPlaying }: { analyzer: AudioAnalyzer | null; isPlaying: boolean }) {
  const { camera } = useThree();
  const [frequency, setFrequency] = useState(0);
  const [lowFreq, setLowFreq] = useState(0);
  const [highFreq, setHighFreq] = useState(0);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const frameCount = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      frameCount.current++;
      
      // 每2帧更新一次频率数据，减少性能开销
      if (frameCount.current % 2 === 0) {
        if (analyzer && isPlaying) {
          setFrequency(analyzer.getAverageFrequency());
          setLowFreq(analyzer.getLowFrequency());
          setHighFreq(analyzer.getHighFrequency());
        } else {
          // 静态时缓慢漂浮
          setFrequency((prev) => prev * 0.95);
          setLowFreq((prev) => prev * 0.95);
          setHighFreq((prev) => prev * 0.95);
        }
      }
      
      // 相机缓慢旋转
      camera.position.x = Math.sin(Date.now() * 0.0003) * 0.5;
      camera.position.y = Math.cos(Date.now() * 0.0002) * 0.3;
      camera.lookAt(0, 0, 0);
    };
    
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [analyzer, isPlaying, camera]);

  return <ParticleField count={6000} frequency={frequency} lowFreq={lowFreq} highFreq={highFreq} mouse={mouse} />;
}

export default function AudioVisualizer() {
  const { isPlaying } = useMusicStore();
  const analyzerRef = useRef<AudioAnalyzer | null>(null);

  useEffect(() => {
    // 延迟初始化 analyzer，等待 audio 元素
    const timer = setTimeout(() => {
      const audioEl = document.querySelector('audio');
      if (audioEl) {
        analyzerRef.current = new AudioAnalyzer();
        analyzerRef.current.init(audioEl as HTMLAudioElement);
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (analyzerRef.current) {
        analyzerRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <SceneContent analyzer={analyzerRef.current} isPlaying={isPlaying} />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/three/
git commit -m "feat: add 3D audio visualizer with particle system and custom shaders"
```

---

## Task 5: UI 组件

**Files:**
- Create: `components/ui/GlassPanel.tsx`
- Create: `components/ui/Navbar.tsx`
- Create: `components/ui/MusicCard.tsx`
- Create: `components/ui/PlayerBar.tsx`

- [ ] **Step 1: 创建玻璃拟态面板**

```typescript
// components/ui/GlassPanel.tsx
'use client';

import { ReactNode } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
}

export default function GlassPanel({ children, className = '' }: GlassPanelProps) {
  return (
    <div className={`glass-panel p-6 ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: 创建导航栏**

```typescript
// components/ui/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import gsap from 'gsap';

const navLinks = [
  { href: '/', label: '首页' },
  { href: '/songlist', label: '歌单' },
  { href: '/singer', label: '歌手' },
  { href: '/musictop', label: '