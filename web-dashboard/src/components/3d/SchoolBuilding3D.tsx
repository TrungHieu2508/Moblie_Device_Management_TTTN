import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';

interface SchoolBuilding3DProps {
  position: [number, number, number];
  name: string;
  campusName?: string;
  deviceCount?: number;
  classroomCount?: number;
  isSelected?: boolean;
  onClick?: () => void;
}

// ─── Window grid with glass effect ────────────────────────────────
const WindowRow = ({ y, z, count = 5, startX = -2, spacing = 0.85, wide = 0.5, tall = 0.55, lit = false }: any) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <mesh key={i} position={[startX + i * spacing, y, z]}>
        <boxGeometry args={[wide, tall, 0.06]} />
        <meshStandardMaterial
          color={lit ? '#fef9c3' : '#1e3a5f'}
          emissive={lit ? '#fbbf24' : '#0a1a2e'}
          emissiveIntensity={lit ? 2.5 : 0.15}
          transparent
          opacity={0.95}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
    ))}
  </>
);

// ─── Pillar ───────────────────────────────────────────────────────
const Pillar = ({ x, z, height = 3.5 }: { x: number; z: number; height?: number }) => (
  <mesh position={[x, height / 2, z]} castShadow>
    <cylinderGeometry args={[0.08, 0.1, height, 8]} />
    <meshStandardMaterial color="#d4c5a0" roughness={0.6} metalness={0.2} />
  </mesh>
);

// ─── Tree with better foliage ─────────────────────────────────────
const SchoolTree = ({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) => (
  <group position={[x, 0, z]} scale={[scale, scale, scale]}>
    {/* Trunk */}
    <mesh position={[0, 0.5, 0]}>
      <cylinderGeometry args={[0.06, 0.09, 1.0, 6]} />
      <meshStandardMaterial color="#5c3d11" roughness={0.9} />
    </mesh>
    {/* Canopy layers */}
    <mesh position={[0, 1.3, 0]}>
      <sphereGeometry args={[0.5, 12, 12]} />
      <meshStandardMaterial
        color="#1a6b30"
        emissive="#0a4a20"
        emissiveIntensity={0.3}
        roughness={0.8}
      />
    </mesh>
    <mesh position={[0, 1.65, 0]}>
      <sphereGeometry args={[0.35, 12, 12]} />
      <meshStandardMaterial
        color="#22883e"
        emissive="#14692e"
        emissiveIntensity={0.4}
        roughness={0.8}
      />
    </mesh>
  </group>
);

// ─── Flagpole with waving flag ────────────────────────────────────
const SchoolFlag = ({ x, z }: { x: number; z: number }) => {
  const flagRef = useRef<THREE.Mesh>(null!);
  const geoRef = useRef<THREE.PlaneGeometry | null>(null);
  const originalPositions = useRef<Float32Array | null>(null);

  useFrame(({ clock }) => {
    if (!flagRef.current || !geoRef.current) return;
    const t = clock.getElapsedTime();
    const pos = geoRef.current.attributes.position;
    if (!originalPositions.current) {
      originalPositions.current = new Float32Array(pos.array);
    }
    for (let i = 0; i < pos.count; i++) {
      const ox = originalPositions.current[i * 3];
      pos.setZ(i, Math.sin(t * 3 + ox * 4) * 0.04 * (ox + 0.4));
    }
    pos.needsUpdate = true;
  });

  const flagTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 0, 512, 320);
      ctx.fillStyle = '#ffd700';
      ctx.translate(256, 160);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * 100, -Math.sin((18 + i * 72) * Math.PI / 180) * 100);
        ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * 40, -Math.sin((54 + i * 72) * Math.PI / 180) * 40);
      }
      ctx.closePath();
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <group position={[x, 0, z]}>
      {/* Pole */}
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 4.4, 8]} />
        <meshStandardMaterial color="#b8b8c0" metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Pole top ball */}
      <mesh position={[0, 4.45, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={1} metalness={0.9} />
      </mesh>
      {/* Flag */}
      <mesh ref={flagRef} position={[0.4, 4.0, 0]}>
        <planeGeometry ref={geoRef as any} args={[0.8, 0.5, 10, 6]} />
        <meshStandardMaterial
          map={flagTexture}
          emissive="#991b1b"
          emissiveIntensity={0.2}
          side={THREE.DoubleSide}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
};

// ─── School gate / entrance ───────────────────────────────────────
const SchoolGate = () => (
  <group position={[0, 0, 3.8]}>
    {/* Left pillar */}
    <mesh position={[-1.2, 0.7, 0]} castShadow>
      <boxGeometry args={[0.3, 1.4, 0.3]} />
      <meshStandardMaterial color="#b8a080" roughness={0.7} metalness={0.2} />
    </mesh>
    {/* Right pillar */}
    <mesh position={[1.2, 0.7, 0]} castShadow>
      <boxGeometry args={[0.3, 1.4, 0.3]} />
      <meshStandardMaterial color="#b8a080" roughness={0.7} metalness={0.2} />
    </mesh>
    {/* Arch top */}
    <mesh position={[0, 1.55, 0]}>
      <boxGeometry args={[2.7, 0.25, 0.35]} />
      <meshStandardMaterial color="#c4a878" roughness={0.6} metalness={0.2} />
    </mesh>
    {/* Gate name plate */}
    <mesh position={[0, 1.75, 0.05]}>
      <boxGeometry args={[1.6, 0.2, 0.06]} />
      <meshStandardMaterial
        color="#1a3a5f"
        emissive="#0a2a4f"
        emissiveIntensity={0.5}
        metalness={0.3}
      />
    </mesh>
    {/* Iron bars (simplified) */}
    {[-0.8, -0.4, 0, 0.4, 0.8].map((x, i) => (
      <mesh key={i} position={[x, 0.55, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.1, 6]} />
        <meshStandardMaterial color="#4a4a5a" metalness={0.9} roughness={0.1} />
      </mesh>
    ))}
  </group>
);

// ─── Walkway path ─────────────────────────────────────────────────
const Walkway = () => (
  <mesh position={[0, 0.03, 2.5]} receiveShadow>
    <boxGeometry args={[1.5, 0.02, 3]} />
    <meshStandardMaterial color="#8a8070" roughness={0.9} metalness={0.1} />
  </mesh>
);

// ═══════════════════════════════════════════════════════════════════
// Main SchoolBuilding3D Component
// ═══════════════════════════════════════════════════════════════════
export const SchoolBuilding3D = ({
  position,
  name,
  campusName,
  deviceCount = 0,
  classroomCount = 0,
  isSelected = false,
  onClick,
}: SchoolBuilding3DProps) => {
  const [hovered, setHover] = useState(false);
  const groupRef = useRef<THREE.Group>(null!);
  const active = hovered || isSelected;

  // Random window lighting (memoized)
  const windowLitPattern = useMemo(() => {
    return Array.from({ length: 20 }, () => Math.random() > 0.4);
  }, []);

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={() => { setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'default'; }}
    >
      {/* ══════════════ Ground / School Yard ══════════════ */}
      <mesh position={[0, -0.03, 0]} receiveShadow>
        <boxGeometry args={[11, 0.04, 10]} />
        <meshStandardMaterial
          color="#1a2e1a"
          emissive={active ? '#0a3a1a' : '#041a0a'}
          emissiveIntensity={active ? 0.4 : 0.15}
          roughness={0.9}
        />
      </mesh>

      {/* ── Concrete courtyard ── */}
      <mesh position={[0, 0.01, 1.5]} receiveShadow>
        <boxGeometry args={[6, 0.01, 3.5]} />
        <meshStandardMaterial color="#4a4a42" roughness={0.95} />
      </mesh>

      {/* ══════════════ Main Building — 3 Floors ══════════════ */}

      {/* ── Floor 1 (Ground floor) ── */}
      <mesh position={[0, 0.7, -0.8]} castShadow>
        <boxGeometry args={[7, 1.3, 3.5]} />
        <meshStandardMaterial
          color="#d4c5a0"
          emissive={active ? '#8a7a50' : '#3a3020'}
          emissiveIntensity={active ? 0.35 : 0.1}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Floor 1 — horizontal molding line */}
      <mesh position={[0, 1.38, -0.79]}>
        <boxGeometry args={[7.1, 0.06, 3.52]} />
        <meshStandardMaterial color="#b8a878" roughness={0.6} />
      </mesh>

      {/* ── Floor 2 ── */}
      <mesh position={[0, 2.05, -0.8]} castShadow>
        <boxGeometry args={[7, 1.3, 3.5]} />
        <meshStandardMaterial
          color="#d0c098"
          emissive={active ? '#8a7a50' : '#2a2518'}
          emissiveIntensity={active ? 0.35 : 0.1}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Floor 2 molding */}
      <mesh position={[0, 2.73, -0.79]}>
        <boxGeometry args={[7.1, 0.06, 3.52]} />
        <meshStandardMaterial color="#b8a878" roughness={0.6} />
      </mesh>

      {/* ── Floor 3 ── */}
      <mesh position={[0, 3.4, -0.8]} castShadow>
        <boxGeometry args={[7, 1.3, 3.5]} />
        <meshStandardMaterial
          color="#c8b890"
          emissive={active ? '#8a7a50' : '#201a10'}
          emissiveIntensity={active ? 0.35 : 0.1}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* ══════════════ Roof ══════════════ */}
      {/* Main roof (blue hipped roof) */}
      <mesh position={[0, 4.55, -0.8]} castShadow>
        <coneGeometry args={[4.5, 1.3, 4]} />
        <meshStandardMaterial
          color="#1e40af"
          emissive={active ? '#1e3a8a' : '#0f172a'}
          emissiveIntensity={active ? 0.6 : 0.2}
          roughness={0.6}
          metalness={0.15}
        />
      </mesh>

      {/* Roof edge trim */}
      <mesh position={[0, 3.92, -0.8]}>
        <boxGeometry args={[7.2, 0.12, 3.7]} />
        <meshStandardMaterial color="#b8a070" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* ══════════════ Windows ══════════════ */}
      {/* Front face — Floor 1 */}
      <WindowRow y={0.7} z={0.96} count={6} startX={-2.5} spacing={1} wide={0.55} tall={0.65} lit={active && windowLitPattern[0]} />
      {/* Front face — Floor 2 */}
      <WindowRow y={2.05} z={0.96} count={6} startX={-2.5} spacing={1} wide={0.55} tall={0.65} lit={active && windowLitPattern[1]} />
      {/* Front face — Floor 3 */}
      <WindowRow y={3.4} z={0.96} count={6} startX={-2.5} spacing={1} wide={0.55} tall={0.65} lit={active && windowLitPattern[2]} />

      {/* Back face windows */}
      <WindowRow y={0.7} z={-2.56} count={6} startX={-2.5} spacing={1} wide={0.55} tall={0.65} lit={active && windowLitPattern[3]} />
      <WindowRow y={2.05} z={-2.56} count={6} startX={-2.5} spacing={1} wide={0.55} tall={0.65} lit={active && windowLitPattern[4]} />
      <WindowRow y={3.4} z={-2.56} count={6} startX={-2.5} spacing={1} wide={0.55} tall={0.65} lit={active && windowLitPattern[5]} />

      {/* ── Front entrance door ── */}
      <mesh position={[0, 0.45, 0.98]}>
        <boxGeometry args={[1.0, 0.85, 0.08]} />
        <meshStandardMaterial
          color="#5a3a1a"
          emissive={active ? '#3a2010' : '#1a1008'}
          emissiveIntensity={active ? 0.6 : 0.2}
          roughness={0.7}
        />
      </mesh>

      {/* ── Entrance canopy / porch ── */}
      <mesh position={[0, 1.2, 1.4]} castShadow>
        <boxGeometry args={[2.5, 0.12, 1.2]} />
        <meshStandardMaterial color="#b8a070" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Canopy support pillars */}
      <Pillar x={-1.1} z={1.9} height={1.2} />
      <Pillar x={1.1} z={1.9} height={1.2} />

      {/* ── Steps ── */}
      <mesh position={[0, 0.06, 1.6]}>
        <boxGeometry args={[2.2, 0.1, 0.6]} />
        <meshStandardMaterial color="#8a8070" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.12, 1.9]}>
        <boxGeometry args={[2.0, 0.08, 0.4]} />
        <meshStandardMaterial color="#8a8070" roughness={0.8} />
      </mesh>

      {/* ══════════════ Side Wings ══════════════ */}
      {/* Left wing */}
      <mesh position={[-4.3, 0.55, -0.3]} castShadow>
        <boxGeometry args={[1.8, 1.0, 2.8]} />
        <meshStandardMaterial
          color="#c8b890"
          emissive={active ? '#6a5a30' : '#1a1508'}
          emissiveIntensity={active ? 0.3 : 0.08}
          roughness={0.7}
        />
      </mesh>
      {/* Left wing roof */}
      <mesh position={[-4.3, 1.3, -0.3]}>
        <boxGeometry args={[2.0, 0.12, 3.0]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.6} />
      </mesh>

      {/* Right wing */}
      <mesh position={[4.3, 0.55, -0.3]} castShadow>
        <boxGeometry args={[1.8, 1.0, 2.8]} />
        <meshStandardMaterial
          color="#c8b890"
          emissive={active ? '#6a5a30' : '#1a1508'}
          emissiveIntensity={active ? 0.3 : 0.08}
          roughness={0.7}
        />
      </mesh>
      {/* Right wing roof */}
      <mesh position={[4.3, 1.3, -0.3]}>
        <boxGeometry args={[2.0, 0.12, 3.0]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.6} />
      </mesh>

      {/* ══════════════ Landscape ══════════════ */}
      <SchoolTree x={-4.8} z={3.8} scale={0.9} />
      <SchoolTree x={4.8} z={3.8} scale={1.0} />
      <SchoolTree x={-4.8} z={-3.8} scale={0.85} />
      <SchoolTree x={4.8} z={-3.8} scale={0.95} />
      <SchoolTree x={-2.5} z={3.5} scale={0.7} />
      <SchoolTree x={2.5} z={3.5} scale={0.75} />

      {/* ── Flagpole ── */}
      <SchoolFlag x={0} z={4.2} />

      {/* ── Gate ── */}
      <SchoolGate />

      {/* ── Walkway ── */}
      <Walkway />

      {/* ── Perimeter fence (low wall) ── */}
      {/* Front fence (left & right of gate) */}
      <mesh position={[-3.5, 0.25, 4.5]}>
        <boxGeometry args={[4.0, 0.5, 0.1]} />
        <meshStandardMaterial color="#6a6a5a" roughness={0.8} />
      </mesh>
      <mesh position={[3.5, 0.25, 4.5]}>
        <boxGeometry args={[4.0, 0.5, 0.1]} />
        <meshStandardMaterial color="#6a6a5a" roughness={0.8} />
      </mesh>
      {/* Side fences */}
      <mesh position={[-5.45, 0.25, 0]}>
        <boxGeometry args={[0.1, 0.5, 9.0]} />
        <meshStandardMaterial color="#6a6a5a" roughness={0.8} />
      </mesh>
      <mesh position={[5.45, 0.25, 0]}>
        <boxGeometry args={[0.1, 0.5, 9.0]} />
        <meshStandardMaterial color="#6a6a5a" roughness={0.8} />
      </mesh>
      {/* Back fence */}
      <mesh position={[0, 0.25, -4.5]}>
        <boxGeometry args={[11.0, 0.5, 0.1]} />
        <meshStandardMaterial color="#6a6a5a" roughness={0.8} />
      </mesh>

      {/* ══════════════ Lighting & Effects ══════════════ */}
      {active && (
        <>
          <pointLight color="#ffd700" intensity={3} distance={8} position={[0, 4, 2]} />
          <pointLight color="#ffffff" intensity={2} distance={6} position={[0, 1, 2]} />
        </>
      )}

      {/* ── Selection glow ring on ground ── */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[5.5, 5.8, 48]} />
          <meshStandardMaterial
            color="#ffd700"
            emissive="#ffd700"
            emissiveIntensity={3}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* ══════════════ School name label ══════════════ */}
      <Text
        position={[0, 5.6, 0]}
        fontSize={0.48}
        color={active ? '#ffffff' : '#e8d8c0'}
        anchorX="center"
        anchorY="middle"
        outlineColor="#000000"
        outlineWidth={0.03}
        font={undefined}
      >
        {name}
      </Text>

      {/* ══════════════ Hover tooltip ══════════════ */}
      {hovered && (
        <Html position={[0, 8.0, 0]} center distanceFactor={14}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(20,15,10,0.97), rgba(10,8,5,0.97))',
            border: '2px solid rgba(255,215,0,0.5)',
            borderRadius: 18,
            padding: '20px 28px',
            color: '#e8d8c0',
            fontSize: 16,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 40px rgba(255,215,0,0.3)',
            minWidth: 260,
            backdropFilter: 'blur(16px)',
          }}>
            <div style={{ fontSize: 22, marginBottom: 6, color: '#fff', fontWeight: 800 }}>🏫 {name}</div>
            {campusName && <div style={{ color: '#a09075', fontSize: 14, marginBottom: 14 }}>📍 {campusName}</div>}
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.4)',
                borderRadius: 12,
                padding: '8px 16px',
                textAlign: 'center',
                flex: 1,
              }}>
                <div style={{ color: '#10b981', fontSize: 24, fontWeight: 900 }}>{classroomCount}</div>
                <div style={{ color: '#8b9a90', fontSize: 12, marginTop: 4 }}>Lớp học</div>
              </div>
              <div style={{
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.4)',
                borderRadius: 12,
                padding: '8px 16px',
                textAlign: 'center',
                flex: 1,
              }}>
                <div style={{ color: '#3b82f6', fontSize: 24, fontWeight: 900 }}>{deviceCount}</div>
                <div style={{ color: '#8b9aa0', fontSize: 12, marginTop: 4 }}>Thiết bị</div>
              </div>
            </div>
            <div style={{ color: '#7a6a50', fontSize: 13, marginTop: 14, textAlign: 'center' }}>Click để xem chi tiết →</div>
          </div>
        </Html>
      )}
    </group>
  );
};

export default SchoolBuilding3D;
