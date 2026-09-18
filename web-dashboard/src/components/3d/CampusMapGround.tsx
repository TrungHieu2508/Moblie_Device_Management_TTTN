import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Procedural Car component (Neon Style) ────────────────────────────
const Car = ({
  axis, laneOffset, speed, color, startPos, range = 140,
}: {
  axis: 'x' | 'z'; laneOffset: number; speed: number; color: string; startPos: number; range?: number;
}) => {
  const meshRef = useRef<THREE.Group>(null!);
  const posRef = useRef(startPos);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    posRef.current += speed * delta * 12;
    if (posRef.current > range / 2) posRef.current = -range / 2;
    if (posRef.current < -range / 2) posRef.current = range / 2;

    if (axis === 'x') {
      meshRef.current.position.set(posRef.current, 0.25, laneOffset);
      meshRef.current.rotation.y = speed > 0 ? 0 : Math.PI;
    } else {
      meshRef.current.position.set(laneOffset, 0.25, posRef.current);
      meshRef.current.rotation.y = speed > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Light streak instead of detailed car for Cyberpunk look */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.5, 0.1, 0.15]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight color={color} distance={4} intensity={1.5} />
    </group>
  );
};

// ─── Glowing Traffic System ──────────────────────────────────────────
const TrafficSystem = () => {
  const cars = useMemo(() => {
    const list: any[] = [];
    const colors = ['#00f3ff', '#ff003c', '#bc13fe', '#00ff66'];
    const roads = [-24, 0, 24];
    
    roads.forEach((lane) => {
      for (let i = 0; i < 3; i++) {
        list.push({ axis: 'x', laneOffset: lane - 0.4, speed: 0.8 + Math.random() * 0.6, color: colors[0], startPos: (Math.random() - 0.5) * 140 }); // Cyan forward
        list.push({ axis: 'x', laneOffset: lane + 0.4, speed: -0.8 - Math.random() * 0.6, color: colors[1], startPos: (Math.random() - 0.5) * 140 }); // Red backward
        list.push({ axis: 'z', laneOffset: lane - 0.4, speed: 0.8 + Math.random() * 0.6, color: colors[0], startPos: (Math.random() - 0.5) * 140 });
        list.push({ axis: 'z', laneOffset: lane + 0.4, speed: -0.8 - Math.random() * 0.6, color: colors[1], startPos: (Math.random() - 0.5) * 140 });
      }
    });
    return list;
  }, []);

  return <group>{cars.map((c, i) => <Car key={i} {...c} />)}</group>;
};

// ─── Holographic Trees ───────────────────────────────────────────────
const Tree = ({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) => (
  <group position={[x, 0.05, z]} scale={scale}>
    <mesh position={[0, 0.6, 0]}>
      <coneGeometry args={[0.6, 1.2, 3]} />
      <meshBasicMaterial color="#00ff88" wireframe transparent opacity={0.3} blending={THREE.AdditiveBlending} />
    </mesh>
    <mesh position={[0, 0.4, 0]}>
      <cylinderGeometry args={[0.02, 0.02, 0.8]} />
      <meshBasicMaterial color="#00ff88" transparent opacity={0.5} />
    </mesh>
  </group>
);

// ─── Cyber Saigon River ─────────────────────────────────────────────
const SaigonRiver = () => {
  const waterRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (waterRef.current) {
      waterRef.current.position.y = 0.03 + Math.sin(clock.getElapsedTime() * 1.5) * 0.01;
    }
  });

  return (
    <mesh ref={waterRef} position={[20, 0.03, -10]} rotation={[-Math.PI / 2, 0, -Math.PI / 6]}>
      <planeGeometry args={[200, 25, 32, 32]} />
      <meshBasicMaterial color="#001133" />
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[200, 25, 32, 32]} />
        <meshBasicMaterial color="#0055ff" wireframe transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>
    </mesh>
  );
};

// ─── Cyber Landmarks ────────────────────────────────────────────────
const Landmark81 = () => (
  <group position={[25, 0.04, -20]}>
    <mesh position={[0, 4, 0]}>
      <boxGeometry args={[4.5, 8, 4.5]} />
      <meshStandardMaterial color="#0a0f18" metalness={0.9} roughness={0.1} emissive="#002244" emissiveIntensity={0.5} />
    </mesh>
    <mesh position={[0, 10, 0]}>
      <boxGeometry args={[3, 8, 3]} />
      <meshStandardMaterial color="#0a0f18" metalness={0.9} roughness={0.1} />
    </mesh>
    <mesh position={[0, 16, 0]}>
      <boxGeometry args={[1.5, 8, 1.5]} />
      <meshStandardMaterial color="#0a0f18" metalness={0.9} roughness={0.1} />
    </mesh>
    {/* Glowing Edges */}
    <mesh position={[0, 4, 0]}>
      <boxGeometry args={[4.6, 8.1, 4.6]} />
      <meshBasicMaterial color="#00d4ff" wireframe transparent opacity={0.3} blending={THREE.AdditiveBlending} />
    </mesh>
    <mesh position={[0, 16, 0]}>
      <boxGeometry args={[1.6, 8.1, 1.6]} />
      <meshBasicMaterial color="#00d4ff" wireframe transparent opacity={0.3} blending={THREE.AdditiveBlending} />
    </mesh>
    {/* Spire */}
    <mesh position={[0, 24, 0]}>
      <cylinderGeometry args={[0.05, 0.1, 10, 8]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  </group>
);

const Bitexco = () => (
  <group position={[-15, 0.04, 10]}>
    <mesh position={[0, 6, 0]}>
      <cylinderGeometry args={[1.2, 2.0, 12, 16]} />
      <meshStandardMaterial color="#0a0f18" metalness={0.9} roughness={0.1} />
    </mesh>
    <mesh position={[0, 6, 0]}>
      <cylinderGeometry args={[1.25, 2.05, 12.1, 16]} />
      <meshBasicMaterial color="#bc13fe" wireframe transparent opacity={0.2} blending={THREE.AdditiveBlending} />
    </mesh>
    {/* Helipad */}
    <mesh position={[1.5, 9, 0]} rotation={[0, 0, 0.1]}>
      <cylinderGeometry args={[1.8, 1.8, 0.1, 32]} />
      <meshBasicMaterial color="#bc13fe" />
    </mesh>
    <mesh position={[0, 13.5, 0]}>
      <cylinderGeometry args={[0.02, 1.2, 3, 16]} />
      <meshBasicMaterial color="#bc13fe" wireframe transparent opacity={0.5} blending={THREE.AdditiveBlending} />
    </mesh>
  </group>
);

// ─── High-tech Dark Buildings ─────────────────────────────────────────
const DetailedBuilding = ({
  x, z, w, d, h
}: {
  x: number; z: number; w: number; d: number; h: number;
}) => (
  <group position={[x, 0.04, z]}>
    <mesh position={[0, h / 2, 0]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color="#070a10" roughness={0.2} metalness={0.8} />
    </mesh>
    {/* Cyber Edge lines */}
    <mesh position={[0, h / 2, 0]}>
      <boxGeometry args={[w + 0.02, h + 0.02, d + 0.02]} />
      <meshBasicMaterial color="#00f3ff" wireframe transparent opacity={0.15} blending={THREE.AdditiveBlending} />
    </mesh>
    {/* Roof neon pad */}
    <mesh position={[0, h + 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
      <planeGeometry args={[w * 0.8, d * 0.8]} />
      <meshBasicMaterial color="#0055ff" transparent opacity={0.4} />
    </mesh>
  </group>
);

// ─── Main Procedural Premium Tech Map ────────────────────────────────
export const CampusMapGround = () => {
  const { blocks, trees } = useMemo(() => {
    const blocksData = [];
    const treesData = [];
    const rng = (seed: number, min: number, max: number) => {
      const x = Math.sin(seed * 9301 + 49297) * 233280;
      return min + ((x - Math.floor(x)) * (max - min));
    };

    for (let row = -6; row <= 6; row++) {
      for (let col = -6; col <= 6; col++) {
        const blockX = col * 8;
        const blockZ = row * 8;
        const seed = row * 100 + col;

        // Skip river
        const riverDist = Math.abs(blockX * Math.cos(-Math.PI / 6) - blockZ * Math.sin(-Math.PI / 6) - 15);
        if (riverDist < 12) continue;

        // Skip Landmarks
        if (Math.abs(blockX - 25) < 8 && Math.abs(blockZ - (-20)) < 8) continue;
        if (Math.abs(blockX - (-15)) < 8 && Math.abs(blockZ - 10) < 8) continue;

        const numBuildings = Math.floor(rng(seed, 2, 5));

        for (let b = 0; b < numBuildings; b++) {
          const bx = blockX + rng(seed + b * 7, -2.5, 2.5);
          const bz = blockZ + rng(seed + b * 13, -2.5, 2.5);
          const bw = rng(seed + b * 3, 1.2, 2.5);
          const bd = rng(seed + b * 5, 1.2, 2.5);
          const bh = rng(seed + b * 11, 1.0, 4.0);
          
          blocksData.push({ x: bx, z: bz, w: bw, d: bd, h: bh });
        }
        
        // Add cyber trees
        if (rng(seed, 0, 1) > 0.3) {
          treesData.push({ x: blockX + rng(seed, -3, 3), z: blockZ + rng(seed + 1, -3, 3) });
        }
      }
    }
    return { blocks: blocksData, trees: treesData };
  }, []);

  return (
    <group>
      {/* Deep Cyber Ground Base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[250, 250]} />
        <meshStandardMaterial color="#020408" roughness={0.8} />
      </mesh>

      {/* City Blocks Base (Dark Glass) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 0]}>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#050812" roughness={0.1} metalness={0.9} />
      </mesh>
      
      {/* Grid Pattern on ground */}
      <gridHelper args={[160, 40, '#0055ff', '#002244']} position={[0, 0.01, 0]} />

      <SaigonRiver />

      {/* Main Roads - Glowing Neon Tracks */}
      {[-40, -24, -8, 8, 24, 40].map(z => (
        <group key={`rh-${z}`} position={[0, 0.02, z]}>
          <mesh rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[160, 2]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[160, 0.1]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
      {[-40, -24, -8, 8, 24, 40].map(x => (
        <group key={`rv-${x}`} position={[x, 0.02, 0]}>
          <mesh rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[2, 160]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[0.1, 160]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}

      {/* HCMC Landmarks in Dark Tech style */}
      <Landmark81 />
      <Bitexco />

      {/* Cyber Trees */}
      {trees.map((t, i) => (
        <Tree key={i} x={t.x} z={t.z} scale={0.7 + Math.random() * 0.5} />
      ))}

      {/* Light-streak Traffic */}
      <TrafficSystem />

      {/* Dark Tech Buildings */}
      {blocks.map((b, i) => (
        <DetailedBuilding key={i} {...b} />
      ))}
    </group>
  );
};

export default CampusMapGround;
