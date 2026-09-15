import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Starfield ─────────────────────────────────────────────────────
export const Starfield = () => {
  const ref = useRef<THREE.Points>(null!);
  const positions = React.useMemo(() => {
    const arr = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 300;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 300;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 300;
    }
    return arr;
  }, []);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.008; });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.25} color="#aa3bff" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
};

// ─── HexGrid ────────────────────────────────────────────────────────
export const HexGrid = ({ size = 120, divisions = 60 }: { size?: number; divisions?: number }) => (
  <group position={[0, -0.02, 0]}>
    <gridHelper args={[size, divisions, '#1a0a2e', '#0d0718']} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#050507" transparent opacity={0.85} />
    </mesh>
  </group>
);

// ─── AnimatedRing ───────────────────────────────────────────────────
export const AnimatedRing = ({ color, radius, speed = 1, y = 0 }: {
  color: string; radius: number; speed?: number; y?: number;
}) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * speed; });
  return (
    <mesh ref={ref} position={[0, y, 0]}>
      <torusGeometry args={[radius, 0.03, 8, 64]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} transparent opacity={0.7} />
    </mesh>
  );
};

// ─── PulsatingRing ─────────────────────────────────────────────────
export const PulsatingRing = ({ color, maxRadius = 3, y = 0 }: {
  color: string; maxRadius?: number; y?: number;
}) => {
  const ref = useRef<THREE.Mesh>(null!);
  const opacityRef = useRef(1);
  const scaleRef = useRef(0.5);
  useFrame((_, delta) => {
    if (!ref.current) return;
    scaleRef.current += delta * 0.5;
    opacityRef.current = Math.max(0, 1 - scaleRef.current / 2);
    if (scaleRef.current > 2) scaleRef.current = 0.5;
    ref.current.scale.setScalar(scaleRef.current);
    (ref.current.material as THREE.MeshStandardMaterial).opacity = opacityRef.current * 0.6;
  });
  return (
    <mesh ref={ref} position={[0, y, 0]}>
      <torusGeometry args={[maxRadius, 0.05, 8, 48]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} transparent opacity={0.6} />
    </mesh>
  );
};

// ─── SharedSceneLights ──────────────────────────────────────────────
export const SharedSceneLights = ({ primaryColor = '#aa3bff', secondaryColor = '#00d4ff' }: {
  primaryColor?: string; secondaryColor?: string;
}) => (
  <>
    <ambientLight intensity={0.25} />
    <directionalLight position={[15, 25, 10]} intensity={1.6} castShadow color="#ffffff"
      shadow-mapSize={[2048, 2048]} />
    <pointLight position={[-15, 10, -10]} intensity={1.2} color={primaryColor} />
    <pointLight position={[10, 5, 15]} intensity={0.8} color={secondaryColor} />
    <hemisphereLight args={['#0d0520', '#000000', 0.4]} />
  </>
);
