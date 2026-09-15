import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface DeviceModel3DProps {
  position: [number, number, number];
  deviceName: string;
  model?: string;
  status: string;
  currentApp?: { appName?: string; packageName?: string };
  onClick?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  ONLINE: '#22c55e',
  OFFLINE: '#64748b',
  WARNING: '#eab308',
  CRITICAL: '#ef4444',
};

export const DeviceModel3D = ({
  position,
  deviceName,
  model,
  status,
  currentApp,
  onClick,
}: DeviceModel3DProps) => {
  const [hovered, setHover] = useState(false);
  const groupRef = useRef<THREE.Group>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const screenRef = useRef<THREE.Mesh>(null!);

  const isOnline = status === 'ONLINE';
  const statusColor = STATUS_COLORS[status] || '#64748b';

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current && isOnline) {
      // Online devices gently bob
      groupRef.current.position.y = position[1] + Math.sin(t * 1.5 + position[0] * 2) * 0.04;
    }
    if (ringRef.current && isOnline) {
      ringRef.current.rotation.z = t * 1.2;
      ringRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
    }
    if (screenRef.current) {
      // Flicker screen slightly when online
      const mat = screenRef.current.material as THREE.MeshStandardMaterial;
      if (isOnline) {
        mat.emissiveIntensity = 1.4 + Math.sin(t * 3 + position[2]) * 0.2;
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={() => { setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'default'; }}
    >
      {/* ── Tablet body ── */}
      <mesh castShadow>
        <boxGeometry args={[0.52, 0.72, 0.06]} />
        <meshStandardMaterial
          color={isOnline ? '#111827' : '#1f1f1f'}
          emissive={hovered ? '#334155' : '#1e293b'}
          emissiveIntensity={0.4}
          metalness={0.95}
          roughness={0.05}
        />
      </mesh>

      {/* ── Screen ── */}
      <mesh ref={screenRef} position={[0, 0, 0.035]}>
        <boxGeometry args={[0.44, 0.62, 0.005]} />
        <meshStandardMaterial
          color={isOnline ? '#001a2e' : '#1a0000'}
          emissive={isOnline ? '#00d4ff' : '#330000'}
          emissiveIntensity={isOnline ? 1.4 : 0.15}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* ── Camera dot ── */}
      <mesh position={[0, 0.32, 0.04]}>
        <circleGeometry args={[0.018, 12]} />
        <meshStandardMaterial
          color="#111"
          emissive={isOnline ? '#00d4ff' : '#333'}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* ── Home button ── */}
      <mesh position={[0, -0.32, 0.038]}>
        <circleGeometry args={[0.025, 16]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={isOnline ? 2 : 0.5}
        />
      </mesh>

      {/* ── Status indicator ring ── */}
      <mesh ref={ringRef} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.025, 8, 32]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={isOnline ? 2.5 : 0.6}
          transparent
          opacity={isOnline ? 0.9 : 0.4}
        />
      </mesh>

      {/* ── Glow light for online devices ── */}
      {isOnline && (
        <pointLight
          color={statusColor}
          intensity={hovered ? 2.5 : 1.2}
          distance={2.5}
          position={[0, 0, 0.1]}
        />
      )}

      {/* ── Hover tooltip ── */}
      <Html
        position={[0, 0.65, 0]}
        center
        style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}
      >
        <div style={{
          background: 'rgba(8,12,24,0.97)',
          border: `1px solid ${statusColor}88`,
          borderRadius: 10,
          padding: '8px 12px',
          color: '#e2e8f0',
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          boxShadow: `0 0 20px ${statusColor}33`,
          minWidth: 130,
        }}>
          <div style={{ marginBottom: 4 }}>📱 {deviceName}</div>
          {model && <div style={{ color: '#6b7280', fontSize: 10 }}>{model}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
            <span style={{ color: statusColor, fontSize: 10 }}>{status}</span>
          </div>
          {currentApp?.appName && (
            <div style={{ color: '#9ca3af', fontSize: 9, marginTop: 3 }}>
              App: {currentApp.appName}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

export default DeviceModel3D;
