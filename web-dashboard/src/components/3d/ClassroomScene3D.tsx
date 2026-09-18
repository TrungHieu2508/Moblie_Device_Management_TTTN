import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';

interface ClassroomScene3DProps {
  classroomName: string;
  devices: Array<{
    id: string;
    deviceName: string;
    model?: string;
    status: string;
    currentApp?: { appName?: string };
  }>;
}

// ─── Tablet on desk ────────────────────────────────────────────────
const DeskTablet = ({ deviceName, model, status, currentApp }: any) => {
  const [hovered, setHovered] = useState(false);
  const colorMap: Record<string, string> = { ONLINE: '#22c55e', OFFLINE: '#64748b', WARNING: '#eab308', CRITICAL: '#ef4444' };
  const statusColor = colorMap[status] || '#64748b';

  return (
    <group position={[0, 0.52, -0.02]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}>
      {/* Tablet body */}
      <mesh rotation={[-Math.PI / 7, 0, 0]} castShadow>
        <boxGeometry args={[0.42, 0.28, 0.018]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 0.005, 0.01]} rotation={[-Math.PI / 7, 0, 0]}>
        <boxGeometry args={[0.36, 0.22, 0.005]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={hovered ? 4 : 2}
          transparent opacity={0.95}
        />
      </mesh>
      {/* Glow */}
      {status === 'ONLINE' && <pointLight color={statusColor} intensity={0.4} distance={1.2} />}
      {/* Tooltip */}
      {hovered && (
        <Html position={[0, 0.6, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(10,12,20,0.95)',
            border: `1px solid ${statusColor}66`,
            borderRadius: 10,
            padding: '10px 16px',
            color: '#e2e8f0',
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: `0 0 20px ${statusColor}33`,
            minWidth: 150,
          }}>
            <div style={{ marginBottom: 4, fontSize: 14 }}>📱 {deviceName || model}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
              <span style={{ color: statusColor, fontSize: 12 }}>{status}</span>
            </div>
            {currentApp?.appName && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>🔹 {currentApp.appName}</div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

// ─── Student Desk + Chair ──────────────────────────────────────────
const StudentDesk = ({ x, z, device }: { x: number; z: number; device?: any }) => (
  <group position={[x, 0, z]}>
    {/* Desk surface */}
    <mesh position={[0, 0.38, 0]} receiveShadow castShadow>
      <boxGeometry args={[0.7, 0.04, 0.5]} />
      <meshStandardMaterial color="#d4a373" roughness={0.8} />
    </mesh>
    {/* Desk legs */}
    {[[-0.28, -0.18], [-0.28, 0.18], [0.28, -0.18], [0.28, 0.18]].map(([lx, lz], i) => (
      <mesh key={i} position={[lx, 0.19, lz]}>
        <cylinderGeometry args={[0.018, 0.018, 0.38, 6]} />
        <meshStandardMaterial color="#8a8a8a" metalness={0.8} />
      </mesh>
    ))}
    {/* Chair seat */}
    <mesh position={[0, 0.25, 0.4]} receiveShadow castShadow>
      <boxGeometry args={[0.35, 0.03, 0.35]} />
      <meshStandardMaterial color="#e9c46a" roughness={0.8} />
    </mesh>
    {/* Chair back */}
    <mesh position={[0, 0.42, 0.55]}>
      <boxGeometry args={[0.35, 0.3, 0.03]} />
      <meshStandardMaterial color="#e9c46a" roughness={0.8} />
    </mesh>
    {/* Chair legs */}
    {[-0.14, 0.14].map(lx =>
      [0.26, 0.54].map(lz => (
        <mesh key={`chair-${lx}-${lz}`} position={[lx, 0.125, lz]}>
          <cylinderGeometry args={[0.015, 0.015, 0.25]} />
          <meshStandardMaterial color="#8a8a8a" metalness={0.8} />
        </mesh>
      ))
    )}
    {/* Tablet if device exists */}
    {device && (
      <DeskTablet
        deviceName={device.deviceName}
        model={device.model}
        status={device.status}
        currentApp={device.currentApp}
      />
    )}
  </group>
);

// ─── ClassroomScene3D ────────────────────────────────────────────────
export const ClassroomScene3D = ({ classroomName, devices }: ClassroomScene3DProps) => {
  const roomRef = useRef<THREE.Group>(null!);

  // Layout: 8 columns x 5 rows = 40 desks
  const COLS = 8;
  const ROWS = 5;
  const COL_SPACING = 1.3;
  const ROW_SPACING = 1.6;

  const roomW = COLS * COL_SPACING + 3;
  const roomD = ROWS * ROW_SPACING + 4;
  const TOTAL_DESKS = COLS * ROWS;

  // Map devices to desk indices deterministically
  const deviceDeskMap = useMemo(() => {
    const map = new Map<number, any>();
    if (devices.length === 0) return map;
    let seed = 42;
    const indices = Array.from({ length: TOTAL_DESKS }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const j = seed % (i + 1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    devices.forEach((device, idx) => {
      if (idx < TOTAL_DESKS) map.set(indices[idx], device);
    });
    return map;
  }, [devices]);

  return (
    <group ref={roomRef}>
      {/* ── Floor ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[roomW, roomD]} />
        <meshStandardMaterial color="#b5baa0" roughness={0.9} />
      </mesh>

      {/* ── Walls ── */}
      {/* Back wall */}
      <mesh position={[0, 2.5, -roomD / 2 + 0.05]} receiveShadow>
        <boxGeometry args={[roomW, 5, 0.1]} />
        <meshStandardMaterial color="#dad7cd" roughness={0.9} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-roomW / 2 + 0.05, 2.5, 0]} receiveShadow>
        <boxGeometry args={[0.1, 5, roomD]} />
        <meshStandardMaterial color="#dad7cd" roughness={0.9} />
      </mesh>
      {/* Right wall */}
      <mesh position={[roomW / 2 - 0.05, 2.5, 0]} receiveShadow>
        <boxGeometry args={[0.1, 5, roomD]} />
        <meshStandardMaterial color="#dad7cd" roughness={0.9} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roomW, roomD]} />
        <meshStandardMaterial color="#e8e4de" roughness={0.95} />
      </mesh>

      {/* ── Windows on left wall ── */}
      {[-3, -1, 1, 3].map((z, i) => (
        <mesh key={i} position={[-roomW / 2 + 0.12, 2.8, z]}>
          <boxGeometry args={[0.05, 1.8, 1.4]} />
          <meshStandardMaterial color="#87ceeb" emissive="#87ceeb" emissiveIntensity={0.3} transparent opacity={0.5} />
        </mesh>
      ))}

      {/* ── Blackboard ── */}
      {/* Frame */}
      <mesh position={[0, 2.5, -roomD / 2 + 0.12]}>
        <boxGeometry args={[5.5, 2.2, 0.06]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.7} />
      </mesh>
      {/* Board surface */}
      <mesh position={[0, 2.5, -roomD / 2 + 0.16]}>
        <boxGeometry args={[5.0, 1.8, 0.05]} />
        <meshStandardMaterial color="#2b2d42" roughness={0.5} />
      </mesh>
      {/* Chalk tray */}
      <mesh position={[0, 1.45, -roomD / 2 + 0.18]}>
        <boxGeometry args={[5.0, 0.1, 0.12]} />
        <meshStandardMaterial color="#6b4226" roughness={0.8} />
      </mesh>

      {/* ── Teacher's desk ── */}
      <mesh position={[0, 0.4, -roomD / 2 + 2]} castShadow>
        <boxGeometry args={[2.0, 0.8, 0.6]} />
        <meshStandardMaterial color="#bc6c25" roughness={0.7} />
      </mesh>

      {/* ── Ceiling Lights ── */}
      {[-3.5, 0, 3.5].map(x =>
        [-3, 0, 3].map(z => (
          <group key={`${x}-${z}`} position={[x, 4.95, z]}>
            <mesh>
              <boxGeometry args={[1.2, 0.08, 0.3]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.5} />
            </mesh>
            <pointLight color="#fffaf0" intensity={1} distance={5} />
          </group>
        ))
      )}

      {/* ── 40 Student Desks ── */}
      {Array.from({ length: TOTAL_DESKS }).map((_, idx) => {
        const row = Math.floor(idx / COLS);
        const col = idx % COLS;
        const x = (col - (COLS - 1) / 2) * COL_SPACING;
        const z = (row - (ROWS - 1) / 2) * ROW_SPACING + 1;
        const device = deviceDeskMap.get(idx);
        return <StudentDesk key={idx} x={x} z={z} device={device} />;
      })}

      {/* ── Classroom name label ── */}
      <Text
        position={[0, 3.2, -roomD / 2 + 0.2]}
        fontSize={0.35}
        color="#10b981"
        anchorX="center"
        anchorY="middle"
        outlineColor="#000"
        outlineWidth={0.015}
      >
        {classroomName}
      </Text>

      {/* ── Stats overlay ── */}
      {devices.length > TOTAL_DESKS && (
        <Text
          position={[roomW / 2 - 1.5, 0.6, roomD / 2 - 0.5]}
          fontSize={0.25}
          color="#f59e0b"
          anchorX="center"
          outlineColor="#000"
          outlineWidth={0.01}
        >
          {`+${devices.length - TOTAL_DESKS} thiết bị khác`}
        </Text>
      )}
    </group>
  );
};

export default ClassroomScene3D;
