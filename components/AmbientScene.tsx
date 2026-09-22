"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, MeshDistortMaterial, Icosahedron } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "@/app/(site)/providers";

function ParticleField({ color }: { color: string }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const count = 700;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 6 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      arr[i * 3 + 2] = r * Math.cos(phi) - 6;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.02;
    ref.current.rotation.x += delta * 0.005;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={0.035}
        sizeAttenuation
        depthWrite={false}
        opacity={0.55}
      />
    </Points>
  );
}

function FloatingGlass() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.children.forEach((child, i) => {
      child.position.y = Math.sin(t * 0.4 + i * 2) * 0.4;
      child.rotation.x = t * 0.15 + i;
      child.rotation.y = t * 0.1 + i;
    });
  });

  const positions: [number, number, number][] = [
    [-3.2, 0, -3],
    [3.4, 1, -5],
    [1.8, -1.4, -2],
  ];

  return (
    <group ref={group}>
      {positions.map((p, i) => (
        <Icosahedron key={i} args={[0.55 - i * 0.08, 0]} position={p}>
          <meshPhysicalMaterial
            color={i % 2 === 0 ? "#2F6BFF" : "#22D3EE"}
            transparent
            opacity={0.18}
            roughness={0.1}
            metalness={0.1}
            transmission={0.3}
          />
        </Icosahedron>
      ))}
    </group>
  );
}

function GradientWave() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = clock.getElapsedTime() * 0.03;
  });
  return (
    <mesh ref={ref} position={[0, 0, -9]} scale={7}>
      <sphereGeometry args={[1, 64, 64]} />
      <MeshDistortMaterial
        color="#2F6BFF"
        transparent
        opacity={0.06}
        distort={0.5}
        speed={1.2}
        roughness={1}
      />
    </mesh>
  );
}

export default function AmbientScene() {
  const { theme } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (reducedMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <ParticleField color={theme === "dark" ? "#7FB3FF" : "#2F6BFF"} />
        <FloatingGlass />
        <GradientWave />
      </Canvas>
    </div>
  );
}
