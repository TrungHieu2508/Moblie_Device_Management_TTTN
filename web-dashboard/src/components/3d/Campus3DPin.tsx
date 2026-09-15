import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface Campus3DPinProps {
  position: [number, number, number];
  name: string;
  address?: string;
  schoolCount?: number;
  isSelected?: boolean;
  onClick?: () => void;
  color?: string;
}

// ─── Pulse ring on ground ──────────────────────────────────────────
const PulseRing = ({ color }: { color: string }) => {
  const ringRef = useRef<THREE.Mesh>(null!);
  const scaleRef = useRef(0.5);

  useFrame((_, dt) => {
    if (!ringRef.current) return;
    scaleRef.current += dt * 0.55;
    const mat = ringRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 0.55 * (1 - scaleRef.current / 2.5));
    ringRef.current.scale.setScalar(scaleRef.current);
    if (scaleRef.current > 2.5) scaleRef.current = 0.5;
  });

  return (
    <mesh ref={ringRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1.1, 40]} />
      <meshBasicMaterial color={color} transparent opacity={0.55} side={THREE.DoubleSide} />
    </mesh>
  );
};

// ─── Teardrop pin — large Google Maps style ────────────────────────
const TearDropPin = ({
  color,
  active,
  elevation,
}: {
  color: string;
  active: boolean;
  elevation: number;
}) => {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.y = elevation + Math.sin(t * 1.3) * 0.15;
  });

  const ei = active ? 0.8 : 0.3;

  return (
    <group ref={groupRef} position={[0, elevation, 0]}>
      {/* Head — large balloon sphere */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <sphereGeometry args={[1.0, 36, 36]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={ei} roughness={0.1} metalness={0.05} />
      </mesh>

      {/* White inner circle */}
      <mesh position={[0, 1.3, 0.92]}>
        <circleGeometry args={[0.42, 28]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.10, 1.0, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={ei} roughness={0.15} />
      </mesh>

      {/* Sharp tip */}
      <mesh position={[0, 0.05, 0]} castShadow rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.14, 0.25, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={ei + 0.1} roughness={0.1} />
      </mesh>

      {/* Glow */}
      {active && <pointLight color={color} intensity={16} distance={16} position={[0, 1.3, 0]} decay={2} />}
    </group>
  );
};

// ─── Campus3DPin ───────────────────────────────────────────────────
export const Campus3DPin = ({
  position,
  name,
  address,
  schoolCount = 0,
  isSelected = false,
  onClick,
  color = '#EA4335',
}: Campus3DPinProps) => {
  const [hovered, setHover] = useState(false);
  const active = hovered || isSelected;
  const pinElev = active ? 3.5 : 2.8;
  const pinColor = isSelected ? '#1A73E8' : color;

  return (
    <group
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={() => { setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'default'; }}
    >
      {/* Ground shadow */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.4, 36]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} />
      </mesh>

      {/* Pulse ring when active */}
      {active && <PulseRing color={pinColor} />}

      {/* The pin */}
      <TearDropPin color={pinColor} active={active} elevation={pinElev} />

      {/* ─── Name label ─────────────────────────────────────────── */}
      <Html
        position={[0, pinElev + 2.8, 0]}
        center
        distanceFactor={10}
        zIndexRange={[100, 0]}
      >
        <div style={{
          background: isSelected ? 'rgba(26,115,232,0.97)' : 'rgba(10,10,10,0.93)',
          color: '#ffffff',
          fontSize: 22,
          fontWeight: 800,
          fontFamily: '"Google Sans", "Noto Sans", system-ui, sans-serif',
          padding: '10px 24px',
          borderRadius: 30,
          whiteSpace: 'nowrap',
          border: `2.5px solid ${isSelected ? '#1A73E8' : 'rgba(255,255,255,0.22)'}`,
          boxShadow: `0 6px 24px rgba(0,0,0,0.6)`,
          letterSpacing: '0.01em',
          userSelect: 'none',
          pointerEvents: 'none',
          lineHeight: 1,
        }}>
          {name}
        </div>
      </Html>

      {/* ─── School count badge ─────────────────────────────────── */}
      {schoolCount > 0 && (
        <Html
          position={[1.5, pinElev + 1.8, 0]}
          center
          distanceFactor={10}
          zIndexRange={[100, 0]}
        >
          <div style={{
            background: '#34A853',
            color: '#fff',
            fontSize: 16,
            fontWeight: 800,
            padding: '6px 16px',
            borderRadius: 20,
            whiteSpace: 'nowrap',
            border: '2.5px solid rgba(255,255,255,0.45)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
            fontFamily: 'system-ui',
            userSelect: 'none',
            pointerEvents: 'none',
          }}>
            🏫 {schoolCount} trường
          </div>
        </Html>
      )}

      {/* ─── Info card on hover ─────────────────────────────────── */}
      {hovered && !isSelected && (
        <Html
          position={[2.5, pinElev + 1.5, 0]}
          center
          distanceFactor={9}
          zIndexRange={[200, 0]}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '16px 20px',
            minWidth: 230,
            maxWidth: 270,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.15)',
            fontFamily: '"Google Sans", system-ui, sans-serif',
            pointerEvents: 'none',
            border: '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}>
            {/* Color strip */}
            <div style={{ height: 5, borderRadius: '12px 12px 0 0', background: color, margin: '-16px -20px 12px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#202124', marginBottom: 6 }}>{name}</div>
            {address && (
              <div style={{ fontSize: 12, color: '#5f6368', marginBottom: 10, lineHeight: 1.5 }}>📍 {address}</div>
            )}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#E8F5E9', color: '#2E7D32',
              fontSize: 13, fontWeight: 700,
              padding: '5px 12px', borderRadius: 10,
            }}>
              🏫 {schoolCount} trường học
            </div>
            <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 10, fontStyle: 'italic' }}>
              Click để xem chi tiết →
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

export default Campus3DPin;
