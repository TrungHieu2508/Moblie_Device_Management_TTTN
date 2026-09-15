import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { DeviceModel3D } from './DeviceModel3D';

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

// ─── Desk (student desk + chair) ───────────────────────────────────
const Desk = ({ x, z, hasDevice = false }: { x: number; z: number; hasDevice?: boolean }) => (
  <group position={[x, 0, z]}>
    {/* Desk surface */}
    <mesh position={[0, 0.38, 0]} receiveShadow castShadow>
      <boxGeometry args={[0.75, 0.04, 0.52]} />
      <meshStandardMaterial color="#6b3a2a" emissive="#3d2010" emissiveIntensity={0.15} roughness={0.7} />
    </mesh>
    {/* Desk legs */}
    {[[-0.32, -0.24], [-0.32, 0.24], [0.32, -0.24], [0.32, 0.24]].map(([lx, lz], i) => (
      <mesh key={i} position={[lx, 0.18, lz]}>
        <cylinderGeometry args={[0.02, 0.02, 0.36, 6]} />
        <meshStandardMaterial color="#4a2a1a" roughness={0.8} />
      </mesh>
    ))}
    {/* Chair */}
    <mesh position={[0, 0.26, -0.42]} receiveShadow castShadow>
      <boxGeometry args={[0.52, 0.04, 0.46]} />
      <meshStandardMaterial color="#1e3a5f" emissive="#0a1a2e" emissiveIntensity={0.1} roughness={0.7} />
    </mesh>
    {/* Chair back */}
    <mesh position={[0, 0.52, -0.63]}>
      <boxGeometry args={[0.5, 0.48, 0.04]} />
      <meshStandardMaterial color="#1e3a5f" emissive="#0a1a2e" emissiveIntensity={0.1} roughness={0.7} />
    </mesh>
    {/* Desk glow if no device (empty) */}
    {!hasDevice && (
      <mesh position={[0, 0.41, 0]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshStandardMaterial
          color="#0a1a2e"
          emissive="#001428"
          emissiveIntensity={0.08}
          transparent
          opacity={0.3}
          rotation={[-Math.PI / 2, 0, 0] as any}
        />
      </mesh>
    )}
  </group>
);

// ─── Blackboard ─────────────────────────────────────────────────────
const Blackboard = () => (
  <group position={[0, 1.6, -4.85]}>
    {/* Frame */}
    <mesh castShadow>
      <boxGeometry args={[5.8, 2.2, 0.08]} />
      <meshStandardMaterial color="#4a3000" roughness={0.9} />
    </mesh>
    {/* Board surface */}
    <mesh position={[0, 0, 0.05]}>
      <boxGeometry args={[5.4, 1.9, 0.02]} />
      <meshStandardMaterial
        color="#0d2b0d"
        emissive="#0a2a10"
        emissiveIntensity={0.2}
        roughness={0.95}
      />
    </mesh>
    {/* Chalk tray */}
    <mesh position={[0, -1.15, 0.06]}>
      <boxGeometry args={[5.4, 0.12, 0.12]} />
      <meshStandardMaterial color="#3a2500" roughness={0.9} />
    </mesh>
  </group>
);

// ─── Teacher podium ─────────────────────────────────────────────────
const Podium = () => (
  <group position={[0, 0, -3.6]}>
    <mesh castShadow receiveShadow>
      <boxGeometry args={[1.2, 0.9, 0.7]} />
      <meshStandardMaterial color="#4a2a10" emissive="#2a1505" emissiveIntensity={0.2} roughness={0.7} />
    </mesh>
    {/* Podium top */}
    <mesh position={[0, 0.47, 0.05]}>
      <boxGeometry args={[1.1, 0.06, 0.6]} />
      <meshStandardMaterial color="#6b3a20" roughness={0.6} />
    </mesh>
  </group>
);

// ─── Ceiling light panel ────────────────────────────────────────────
const CeilingLight = ({ x, z }: { x: number; z: number }) => (
  <group position={[x, 2.95, z]}>
    <mesh>
      <boxGeometry args={[1.6, 0.04, 0.5]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#e0f0ff"
        emissiveIntensity={2}
        transparent
        opacity={0.9}
      />
    </mesh>
    <pointLight color="#e0f0ff" intensity={1.5} distance={5} />
  </group>
);

// ─── ClassroomScene3D ────────────────────────────────────────────────
export const ClassroomScene3D = ({ classroomName, devices }: ClassroomScene3DProps) => {
  const roomRef = useRef<THREE.Group>(null!);

  // Layout: 5 columns x 6 rows of desks
  const COLS = 5;
  const ROWS = 6;
  const COL_SPACING = 1.4;
  const ROW_SPACING = 1.3;
  const COL_OFFSET = ((COLS - 1) * COL_SPACING) / 2;
  const ROW_OFFSET = -0.8;

  const maxDevices = COLS * ROWS;
  const displayDevices = devices.slice(0, maxDevices);

  // Build desk grid
  const deskPositions: [number, number, number][] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * COL_SPACING - COL_OFFSET;
      const z = row * ROW_SPACING + ROW_OFFSET;
      deskPositions.push([x, 0, z]);
    }
  }

  return (
    <group ref={roomRef}>
      {/* ── Room floor ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 13]} />
        <meshStandardMaterial
          color="#0a0e1a"
          emissive="#04060f"
          emissiveIntensity={0.3}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* ── Floor grid lines ── */}
      <gridHelper args={[12, 12, '#0d1a2e', '#08101e']} position={[0, 0.001, 0]} />

      {/* ── Room walls ── */}
      {/* Back wall */}
      <mesh position={[0, 1.5, -5]} receiveShadow>
        <boxGeometry args={[12, 3, 0.12]} />
        <meshStandardMaterial color="#080e1c" emissive="#040810" emissiveIntensity={0.2} roughness={0.8} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-6, 1.5, 0.5]} receiveShadow>
        <boxGeometry args={[0.12, 3, 13]} />
        <meshStandardMaterial color="#060c18" emissive="#030608" emissiveIntensity={0.15} roughness={0.85} />
      </mesh>
      {/* Right wall */}
      <mesh position={[6, 1.5, 0.5]} receiveShadow>
        <boxGeometry args={[0.12, 3, 13]} />
        <meshStandardMaterial color="#060c18" emissive="#030608" emissiveIntensity={0.15} roughness={0.85} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 13]} />
        <meshStandardMaterial color="#050810" emissive="#030508" emissiveIntensity={0.1} roughness={0.9} />
      </mesh>

      {/* ── Wall accent strips (neon) ── */}
      <mesh position={[0, 2.92, -4.9]}>
        <boxGeometry args={[11.5, 0.05, 0.05]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={3} transparent opacity={0.8} />
      </mesh>
      <mesh position={[-5.9, 1.5, 0]}>
        <boxGeometry args={[0.05, 0.05, 12]} />
        <meshStandardMaterial color="#aa3bff" emissive="#aa3bff" emissiveIntensity={2} transparent opacity={0.6} />
      </mesh>
      <mesh position={[5.9, 1.5, 0]}>
        <boxGeometry args={[0.05, 0.05, 12]} />
        <meshStandardMaterial color="#aa3bff" emissive="#aa3bff" emissiveIntensity={2} transparent opacity={0.6} />
      </mesh>

      {/* ── Ceiling lights ── */}
      <CeilingLight x={-2.5} z={-2.5} />
      <CeilingLight x={2.5} z={-2.5} />
      <CeilingLight x={-2.5} z={2} />
      <CeilingLight x={2.5} z={2} />
      <CeilingLight x={0} z={5.5} />

      {/* ── Blackboard ── */}
      <Blackboard />

      {/* ── Podium ── */}
      <Podium />

      {/* ── Desks + Devices ── */}
      {deskPositions.map((pos, idx) => {
        const device = displayDevices[idx];
        return (
          <group key={idx}>
            <Desk x={pos[0]} z={pos[2]} hasDevice={!!device} />
            {device && (
              <DeviceModel3D
                position={[pos[0], 0.48, pos[2] - 0.04]}
                deviceName={device.deviceName}
                model={device.model}
                status={device.status}
                currentApp={device.currentApp}
              />
            )}
          </group>
        );
      })}

      {/* ── Classroom name label ── */}
      <Text
        position={[0, 2.65, -4.7]}
        fontSize={0.3}
        color="#4ade80"
        anchorX="center"
        anchorY="middle"
        outlineColor="#000"
        outlineWidth={0.015}
      >
        {classroomName}
      </Text>

      {/* ── Stats overlay ── */}
      {devices.length > maxDevices && (
        <Text
          position={[3.8, 0.6, 6.5]}
          fontSize={0.25}
          color="#f59e0b"
          anchorX="center"
          outlineColor="#000"
          outlineWidth={0.01}
        >
          {`+${devices.length - maxDevices} thiết bị khác`}
        </Text>
      )}
    </group>
  );
};

export default ClassroomScene3D;
