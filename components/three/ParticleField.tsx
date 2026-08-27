'use client';

/**
 * ParticleField - 星际穿越 3D 场景（R3F + shader 思路的简化实现）
 * 星点沿 -z 向观察者飞行，速度由音频能量驱动、节拍时爆发加速；
 * 帧数据经 subscribeFrame 拷贝标量进 ref，由 R3F 渲染循环消费，0 React 重渲染。
 */
import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { subscribeFrame } from '@/lib/audio/frameScheduler';

interface AudioScalars {
  energy: number;
  bass: number;
  treble: number;
  isBeat: boolean;
}

interface ParticleFieldProps {
  starCount?: number;
  className?: string;
}

const TUNNEL_DEPTH = 60;
const TUNNEL_RADIUS = 14;

export default function ParticleField({
  starCount = 1500,
  className = 'absolute inset-0',
}: ParticleFieldProps) {
  const scalarsRef = useRef<AudioScalars>({ energy: 0, bass: 0, treble: 0, isBeat: false });

  useEffect(() => {
    return subscribeFrame((frame) => {
      const s = scalarsRef.current;
      s.energy = frame.energy;
      s.bass = frame.bass;
      s.treble = frame.treble;
      s.isBeat = frame.beat.isBeat;
    });
  }, []);

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 0], fov: 80 }} dpr={[1, 1.5]}>
        <StarTunnel scalarsRef={scalarsRef} count={starCount} />
      </Canvas>
    </div>
  );
}

function StarTunnel({
  scalarsRef,
  count,
}: {
  scalarsRef: React.MutableRefObject<AudioScalars>;
  count: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const speedRef = useRef(6);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#a855f7'),
      new THREE.Color('#ec4899'),
      new THREE.Color('#06b6d4'),
      new THREE.Color('#ffffff'),
    ];

    for (let i = 0; i < count; i++) {
      // 环形隧道分布（避开中心视野）
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * TUNNEL_RADIUS;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = -Math.random() * TUNNEL_DEPTH;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, [count]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const { energy, bass, treble, isBeat } = scalarsRef.current;

    // 速度：基础 + 能量驱动，节拍瞬时爆发，随后指数回落
    const targetSpeed = 5 + energy * 45;
    if (isBeat) speedRef.current = targetSpeed + bass * 40;
    speedRef.current = THREE.MathUtils.lerp(speedRef.current, targetSpeed, 0.06);

    const pos = points.geometry.attributes.position.array as Float32Array;
    const step = speedRef.current * delta;

    for (let i = 0; i < count; i++) {
      const zi = i * 3 + 2;
      pos[zi] += step;
      // 飞出视野后回收到隧道深处
      if (pos[zi] > 2) {
        pos[zi] = -TUNNEL_DEPTH;
      }
    }
    points.geometry.attributes.position.needsUpdate = true;

    // 隧道随高频轻微扭转
    points.rotation.z += delta * (0.02 + treble * 0.3);

    if (materialRef.current) {
      materialRef.current.size = 0.12 + energy * 0.25;
      materialRef.current.opacity = 0.65 + energy * 0.35;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.12}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
