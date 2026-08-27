'use client';

/**
 * 3D 粒子背景（自驱动）
 * R3F 场景；帧数据经 subscribeFrame 拷贝标量进 mutable ref，
 * 由 R3F 自身的渲染循环消费，组件 0 React 重渲染。
 * dpr 限制 [1, 1.5]，粒子数可由降级档位控制。
 */
import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { subscribeFrame } from '@/lib/audio/frameScheduler';

interface AudioScalars {
  energy: number;
  bass: number;
  isBeat: boolean;
}

interface ParticleBackgroundProps {
  color?: string;
  particleCount?: number;
  className?: string;
}

export function ParticleBackground({
  color = '#667eea',
  particleCount = 2000,
  className = 'fixed inset-0 -z-10',
}: ParticleBackgroundProps) {
  const scalarsRef = useRef<AudioScalars>({ energy: 0, bass: 0, isBeat: false });

  // 从帧调度器拷贝标量（不持有共享缓冲区引用）
  useEffect(() => {
    return subscribeFrame((frame) => {
      const s = scalarsRef.current;
      s.energy = frame.energy;
      s.bass = frame.bass;
      s.isBeat = frame.beat.isBeat;
    });
  }, []);

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }} dpr={[1, 1.5]}>
        <Particles scalarsRef={scalarsRef} color={color} count={particleCount} />
      </Canvas>
    </div>
  );
}

/**
 * 粒子系统
 */
function Particles({
  scalarsRef,
  color,
  count,
}: {
  scalarsRef: React.MutableRefObject<AudioScalars>;
  color: string;
  count: number;
}) {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  // 初始化粒子位置
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      randoms[i] = Math.random();
    }

    return { positions, randoms };
  }, [count]);

  // 动画帧
  useFrame((state) => {
    if (!meshRef.current) return;

    const { energy, bass, isBeat } = scalarsRef.current;
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;

    // 根据能量调整粒子运动
    const speed = 0.001 + energy * 0.01;
    const spread = 1 + bass * 2;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const random = particles.randoms[i];

      // 粒子波动运动
      positions[i3] += Math.sin(time * speed + random * 10) * 0.002 * spread;
      positions[i3 + 1] += Math.cos(time * speed + random * 10) * 0.002 * spread;
      positions[i3 + 2] += Math.sin(time * speed * 0.5 + random * 5) * 0.001;

      // 边界检查
      if (Math.abs(positions[i3]) > 5) positions[i3] *= -0.9;
      if (Math.abs(positions[i3 + 1]) > 5) positions[i3 + 1] *= -0.9;
      if (Math.abs(positions[i3 + 2]) > 5) positions[i3 + 2] *= -0.9;
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;

    // 节拍时放大
    if (isBeat && materialRef.current) {
      materialRef.current.size = 0.08 + energy * 0.12;
    } else if (materialRef.current) {
      materialRef.current.size = THREE.MathUtils.lerp(
        materialRef.current.size,
        0.03 + energy * 0.05,
        0.1
      );
    }

    // 旋转
    meshRef.current.rotation.y += 0.0005 + energy * 0.002;
    meshRef.current.rotation.x += 0.0002;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles.positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.04}
        color={color}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
