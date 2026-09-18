import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import { useQuery } from '@tanstack/react-query';
import { getAllCampuses, getSchools, getClassrooms } from '../../services/schoolService';
import { getDevices } from '../../services/deviceService';
import { useAuthStore } from '../../store/authStore';
import { Button, Typography, Spin } from 'antd';
import { ArrowLeftOutlined, GlobalOutlined } from '@ant-design/icons';
import * as THREE from 'three';
import { Campus3DPin } from '../../components/3d/Campus3DPin';
import { SchoolBuilding3D } from '../../components/3d/SchoolBuilding3D';
import { CampusMapGround } from '../../components/3d/CampusMapGround';

const { Title, Text: AntText } = Typography;

// ─── Starfield background ─────────────────────────────────────────
const Starfield = () => {
  const ref = useRef<THREE.Points>(null!);
  const positions = React.useMemo(() => {
    const arr = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 200;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 200;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    return arr;
  }, []);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.01; });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.3} color="#aa3bff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
};

// ─── Ground grid ──────────────────────────────────────────────────
const GroundGrid = ({ level }: { level: string }) => {
  const gridColor = level === 'CAMPUS' ? '#0a2a1a' : level === 'SCHOOL' ? '#0a1a0a' : '#0d0718';
  const planeColor = level === 'CAMPUS' ? '#040a06' : level === 'SCHOOL' ? '#050a05' : '#050507';
  return (
    <group position={[0, -0.02, 0]}>
      <gridHelper args={[140, 70, gridColor, gridColor]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color={planeColor} transparent opacity={0.9} />
      </mesh>
    </group>
  );
};

// (CampusMapGround imported from components/3d/CampusMapGround)

// ─── ClassroomModel — Detailed Miniature Classroom ─────────────────────

// Mini Tablet on a desk
const MiniTablet = ({ statusColor = '#22c55e' }: { statusColor?: string }) => (
  <group position={[0, 0.39, -0.02]}>
    {/* Tablet body */}
    <mesh rotation={[-Math.PI / 6, 0, 0]} castShadow>
      <boxGeometry args={[0.22, 0.14, 0.012]} />
      <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
    </mesh>
    {/* Screen */}
    <mesh position={[0, 0.003, 0.007]} rotation={[-Math.PI / 6, 0, 0]}>
      <boxGeometry args={[0.19, 0.11, 0.003]} />
      <meshStandardMaterial 
        color={statusColor} 
        emissive={statusColor} 
        emissiveIntensity={2.5} 
        transparent opacity={0.95} 
      />
    </mesh>
  </group>
);

const MiniDesk = ({ position, hasTablet = false, tabletColor }: { position: [number, number, number]; hasTablet?: boolean; tabletColor?: string }) => (
  <group position={position}>
    {/* Desk surface */}
    <mesh position={[0, 0.35, 0]} castShadow>
      <boxGeometry args={[0.5, 0.04, 0.35]} />
      <meshStandardMaterial color="#d4a373" roughness={0.8} />
    </mesh>
    {/* Desk legs */}
    {[-0.2, 0.2].map(x => 
      [-0.12, 0.12].map(z => (
        <mesh key={`${x}-${z}`} position={[x, 0.175, z]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.35]} />
          <meshStandardMaterial color="#8a8a8a" metalness={0.8} />
        </mesh>
      ))
    )}
    {/* Chair seat */}
    <mesh position={[0, 0.2, 0.3]} castShadow>
      <boxGeometry args={[0.25, 0.03, 0.25]} />
      <meshStandardMaterial color="#e9c46a" roughness={0.8} />
    </mesh>
    {/* Chair back */}
    <mesh position={[0, 0.35, 0.41]} castShadow>
      <boxGeometry args={[0.25, 0.25, 0.03]} />
      <meshStandardMaterial color="#e9c46a" roughness={0.8} />
    </mesh>
    {/* Tablet on desk if active */}
    {hasTablet && <MiniTablet statusColor={tabletColor} />}
  </group>
);

const ClassroomModel = ({ position, name, onClick, activeDeviceCount = 0 }: any) => {
  const [hovered, setHover] = useState(false);
  const groupRef = useRef<THREE.Group>(null!);

  // Desk positions for 6 student desks
  const deskPositions: [number, number, number][] = [
    [-0.8, 0.05, -0.1], [0, 0.05, -0.1], [0.8, 0.05, -0.1],
    [-0.8, 0.05, 0.7],  [0, 0.05, 0.7],  [0.8, 0.05, 0.7],
  ];

  // Determine which desks get tablets (seeded by name for consistency)
  const tabletDesks = useMemo(() => {
    if (activeDeviceCount <= 0) return new Set<number>();
    // Simple hash from name to create a deterministic shuffle
    let seed = 0;
    for (let i = 0; i < (name || '').length; i++) seed += (name || '').charCodeAt(i) * (i + 1);
    // Fisher-Yates-like shuffle of desk indices
    const indices = [0, 1, 2, 3, 4, 5];
    for (let i = indices.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const j = seed % (i + 1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return new Set(indices.slice(0, Math.min(activeDeviceCount, 6)));
  }, [activeDeviceCount, name]);

  useFrame((state) => {
    // Subtle floating effect for the whole classroom
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position} onClick={onClick}
      onPointerOver={() => { setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'default'; }}>
      
      {/* Floor */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[3.2, 0.1, 3.2]} />
        <meshStandardMaterial color="#a3b18a" roughness={0.9} />
      </mesh>

      {/* Back Wall */}
      <mesh position={[0, 0.8, -1.55]} receiveShadow>
        <boxGeometry args={[3.2, 1.6, 0.1]} />
        <meshStandardMaterial color="#dad7cd" roughness={0.9} />
      </mesh>

      {/* Side Walls (Low) */}
      <mesh position={[-1.55, 0.4, 0]} receiveShadow>
        <boxGeometry args={[0.1, 0.8, 3.2]} />
        <meshStandardMaterial color="#dad7cd" roughness={0.9} />
      </mesh>
      <mesh position={[1.55, 0.4, 0]} receiveShadow>
        <boxGeometry args={[0.1, 0.8, 3.2]} />
        <meshStandardMaterial color="#dad7cd" roughness={0.9} />
      </mesh>

      {/* Blackboard */}
      <mesh position={[0, 0.9, -1.49]}>
        <boxGeometry args={[2.0, 0.8, 0.05]} />
        <meshStandardMaterial color="#2b2d42" roughness={0.6} />
      </mesh>
      
      {/* Board Frame */}
      <mesh position={[0, 0.9, -1.5]}>
        <boxGeometry args={[2.1, 0.9, 0.06]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.7} />
      </mesh>

      {/* Teacher's Desk */}
      <mesh position={[0, 0.4, -0.9]} castShadow>
        <boxGeometry args={[1.0, 0.4, 0.4]} />
        <meshStandardMaterial color="#bc6c25" roughness={0.7} />
      </mesh>

      {/* Student Desks (2 rows of 3) — tablets appear on active desks */}
      {deskPositions.map((pos, idx) => (
        <MiniDesk key={idx} position={pos} hasTablet={tabletDesks.has(idx)} tabletColor="#22c55e" />
      ))}

      {/* Overhead Lights */}
      {[-0.8, 0.8].map(x => (
        <mesh key={x} position={[x, 1.8, -0.5]}>
          <boxGeometry args={[0.6, 0.05, 0.2]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={hovered ? 2 : 1} />
        </mesh>
      ))}

      {/* Glowing Ground Selection Ring */}
      {hovered && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.2, 2.4, 32]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Name Label Floating Above */}
      <Html position={[0, 2.8, 0]} center distanceFactor={14} zIndexRange={[100, 0]}>
        <div style={{
          background: hovered ? 'rgba(16, 185, 129, 0.35)' : 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `2px solid ${hovered ? '#34d399' : 'rgba(16, 185, 129, 0.4)'}`,
          borderRadius: '24px',
          padding: '20px 48px',
          color: '#ffffff',
          fontSize: 34,
          fontWeight: 900,
          fontFamily: '"Google Sans", "Noto Sans", sans-serif',
          whiteSpace: 'nowrap',
          boxShadow: hovered ? '0 0 50px rgba(16, 185, 129, 0.8), inset 0 0 20px rgba(16, 185, 129, 0.4)' : '0 10px 40px rgba(0,0,0,0.8)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ 
            textTransform: 'uppercase', 
            letterSpacing: '2px', 
            textShadow: hovered ? '0 0 20px #34d399' : '0 4px 8px rgba(0,0,0,0.9)' 
          }}>
            📚 {name}
          </div>
          {hovered && (
            <div style={{ fontSize: 16, color: '#ecfdf5', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '6px 20px', borderRadius: '16px' }}>
              Click xem thiết bị →
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

// ─── DeviceClassroomView — Large 3D Classroom with 40 desks ─────────
const DeviceTablet = ({ position, name, status, isHovered, onHover, onUnhover }: any) => {
  const colorMap: Record<string, string> = { ONLINE: '#22c55e', OFFLINE: '#64748b', WARNING: '#eab308', CRITICAL: '#ef4444' };
  const statusColor = colorMap[status] || '#64748b';
  return (
    <group position={position}
      onPointerOver={(e) => { e.stopPropagation(); onHover?.(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { onUnhover?.(); document.body.style.cursor = 'default'; }}>
      {/* Tablet body */}
      <mesh rotation={[-Math.PI / 6, 0, 0]} castShadow>
        <boxGeometry args={[0.35, 0.22, 0.015]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 0.004, 0.009]} rotation={[-Math.PI / 6, 0, 0]}>
        <boxGeometry args={[0.30, 0.18, 0.004]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={isHovered ? 4 : 2} transparent opacity={0.95} />
      </mesh>
      {/* Glow */}
      {status === 'ONLINE' && <pointLight color={statusColor} intensity={0.5} distance={1.5} />}
      {/* Tooltip */}
      {isHovered && (
        <Html position={[0, 0.5, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(10,12,20,0.95)', border: `1px solid ${statusColor}66`, borderRadius: 10, padding: '8px 14px', color: '#e2e8f0', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: `0 0 20px ${statusColor}33`, minWidth: 140 }}>
            <div style={{ marginBottom: 4 }}>📱 {name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
              <span style={{ color: statusColor, fontSize: 11 }}>{status}</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

const DeviceClassroomView = ({ devices: displayDevices, classroomName }: { devices: any[]; classroomName: string }) => {
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);
  const ROWS = 5;
  const COLS = 8;
  const TOTAL_DESKS = ROWS * COLS; // 40
  const DESK_SPACING_X = 1.3;
  const DESK_SPACING_Z = 1.6;
  const roomW = COLS * DESK_SPACING_X + 3;
  const roomD = ROWS * DESK_SPACING_Z + 4;

  // Map devices to desk indices deterministically
  const deviceDeskMap = useMemo(() => {
    const map = new Map<number, any>(); // deskIndex -> device
    if (displayDevices.length === 0) return map;
    let seed = 42;
    const indices = Array.from({ length: TOTAL_DESKS }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const j = seed % (i + 1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    displayDevices.forEach((device: any, idx: number) => {
      if (idx < TOTAL_DESKS) map.set(indices[idx], device);
    });
    return map;
  }, [displayDevices]);

  return (
    <group>
      {/* Floor */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[roomW, 0.1, roomD]} />
        <meshStandardMaterial color="#b5baa0" roughness={0.9} />
      </mesh>

      {/* Back Wall */}
      <mesh position={[0, 2.5, -roomD / 2 + 0.05]} receiveShadow>
        <boxGeometry args={[roomW, 5, 0.1]} />
        <meshStandardMaterial color="#dad7cd" roughness={0.9} />
      </mesh>

      {/* Left Wall */}
      <mesh position={[-roomW / 2 + 0.05, 2.5, 0]} receiveShadow>
        <boxGeometry args={[0.1, 5, roomD]} />
        <meshStandardMaterial color="#dad7cd" roughness={0.9} />
      </mesh>

      {/* Right Wall */}
      <mesh position={[roomW / 2 - 0.05, 2.5, 0]} receiveShadow>
        <boxGeometry args={[0.1, 5, roomD]} />
        <meshStandardMaterial color="#dad7cd" roughness={0.9} />
      </mesh>

      {/* Blackboard */}
      <mesh position={[0, 2.5, -roomD / 2 + 0.12]}>
        <boxGeometry args={[5, 2, 0.06]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.5, -roomD / 2 + 0.16]}>
        <boxGeometry args={[4.6, 1.6, 0.05]} />
        <meshStandardMaterial color="#2b2d42" roughness={0.5} />
      </mesh>

      {/* Teacher's Desk */}
      <mesh position={[0, 0.45, -roomD / 2 + 1.8]} castShadow>
        <boxGeometry args={[2.0, 0.8, 0.6]} />
        <meshStandardMaterial color="#bc6c25" roughness={0.7} />
      </mesh>

      {/* Ceiling Lights */}
      {[-3, 0, 3].map(x =>
        [-2, 2].map(z => (
          <mesh key={`${x}-${z}`} position={[x, 4.95, z]}>
            <boxGeometry args={[1.2, 0.08, 0.3]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.5} />
          </mesh>
        ))
      )}

      {/* Windows on left wall */}
      {[-2, 0, 2].map((z, i) => (
        <mesh key={i} position={[-roomW / 2 + 0.12, 2.8, z]}>
          <boxGeometry args={[0.05, 1.5, 1.2]} />
          <meshStandardMaterial color="#87ceeb" emissive="#87ceeb" emissiveIntensity={0.3} transparent opacity={0.6} />
        </mesh>
      ))}

      {/* 40 Student Desks */}
      {Array.from({ length: TOTAL_DESKS }).map((_, idx) => {
        const row = Math.floor(idx / COLS);
        const col = idx % COLS;
        const x = (col - (COLS - 1) / 2) * DESK_SPACING_X;
        const z = (row - (ROWS - 1) / 2) * DESK_SPACING_Z + 1;
        const device = deviceDeskMap.get(idx);
        return (
          <group key={idx} position={[x, 0, z]}>
            {/* Desk surface */}
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[0.7, 0.04, 0.5]} />
              <meshStandardMaterial color="#d4a373" roughness={0.8} />
            </mesh>
            {/* Desk legs */}
            {[-0.28, 0.28].map(lx =>
              [-0.18, 0.18].map(lz => (
                <mesh key={`${lx}-${lz}`} position={[lx, 0.225, lz]}>
                  <cylinderGeometry args={[0.018, 0.018, 0.45]} />
                  <meshStandardMaterial color="#8a8a8a" metalness={0.8} />
                </mesh>
              ))
            )}
            {/* Chair */}
            <mesh position={[0, 0.25, 0.4]}>
              <boxGeometry args={[0.35, 0.03, 0.35]} />
              <meshStandardMaterial color="#e9c46a" roughness={0.8} />
            </mesh>
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
            {/* Tablet if device assigned */}
            {device && (
              <DeviceTablet
                position={[0, 0.58, -0.05]}
                name={device.deviceName || device.model}
                status={device.status}
                isHovered={hoveredDevice === device.id}
                onHover={() => setHoveredDevice(device.id)}
                onUnhover={() => setHoveredDevice(null)}
              />
            )}
          </group>
        );
      })}

      {/* Classroom Name Label */}
      <Html position={[0, 6, 0]} center distanceFactor={18} zIndexRange={[100, 0]}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(16px)',
          border: '2px solid rgba(59, 130, 246, 0.5)',
          borderRadius: '20px',
          padding: '16px 40px',
          color: '#ffffff',
          fontSize: 30,
          fontWeight: 900,
          fontFamily: '"Google Sans", "Noto Sans", sans-serif',
          whiteSpace: 'nowrap',
          boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
          textTransform: 'uppercase',
          letterSpacing: '2px',
        }}>
          📚 {classroomName} &mdash; {displayDevices.filter((d: any) => d.status === 'ONLINE').length}/{displayDevices.length} Online
        </div>
      </Html>
    </group>
  );
};

// ─── Map3DPage ─────────────────────────────────────────────────────
const Map3DPage = () => {
  const { user } = useAuthStore();
  const role = user?.role;

  const [viewLevel, setViewLevel] = useState<'CAMPUS' | 'SCHOOL' | 'CLASSROOM' | 'DEVICE'>(
    role === 'SUPER_ADMIN' ? 'CAMPUS' : role === 'IT_ADMIN' ? 'SCHOOL' : 'CLASSROOM'
  );
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(role !== 'SUPER_ADMIN' ? (user?.schoolId || null) : null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);

  const { data: campuses = [], isLoading: loadingCampuses } = useQuery({ queryKey: ['campuses'], queryFn: getAllCampuses, enabled: viewLevel === 'CAMPUS' });
  const { data: schoolsData, isLoading: loadingSchools } = useQuery({ queryKey: ['schools', { campusId: selectedCampusId, size: 100 }], queryFn: () => getSchools({ page: 0, size: 100, campusId: selectedCampusId || undefined }), enabled: viewLevel === 'SCHOOL' || (role !== 'SUPER_ADMIN' && role !== 'TEACHER') });
  const schools = schoolsData?.content || [];
  
  // Fetch all schools to count them for campuses
  const { data: allSchoolsData } = useQuery({ queryKey: ['all_schools'], queryFn: () => getSchools({ page: 0, size: 500 }), enabled: viewLevel === 'CAMPUS' });
  const allSchools = allSchoolsData?.content || [];

  const { data: classrooms = [], isLoading: loadingClassrooms } = useQuery({ queryKey: ['classrooms', selectedSchoolId], queryFn: () => getClassrooms(selectedSchoolId as string), enabled: (viewLevel === 'CLASSROOM' || role === 'TEACHER') && !!selectedSchoolId });
  const { data: devicesData, isLoading: loadingDevices } = useQuery({ queryKey: ['devices_map', selectedSchoolId], queryFn: () => getDevices({ page: 0, size: 500, schoolId: selectedSchoolId || undefined }), enabled: (viewLevel === 'CLASSROOM' || viewLevel === 'DEVICE') && !!selectedSchoolId });
  const devices = devicesData?.content || [];

  const handleBack = () => {
    if (viewLevel === 'DEVICE') { setViewLevel('CLASSROOM'); setSelectedClassroomId(null); }
    else if (viewLevel === 'CLASSROOM') { if (role === 'TEACHER') return; setViewLevel('SCHOOL'); setSelectedSchoolId(null); }
    else if (viewLevel === 'SCHOOL') { if (role !== 'SUPER_ADMIN') return; setViewLevel('CAMPUS'); setSelectedCampusId(null); }
  };

  const getGridLayout = (count: number, spacing: number) => {
    const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
    const layout: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      layout.push([(col - (cols - 1) / 2) * spacing, 0, (row - (Math.ceil(count / cols) - 1) / 2) * spacing]);
    }
    return layout;
  };

  const getRadialLayout = (count: number, radius: number = 28) => {
    const layout: [number, number, number][] = [];
    if (count === 1) return [[0, 0, 25]]; // If only one campus, place it nicely in front
    
    // Distribute campuses evenly in a circle around the center
    for (let i = 0; i < count; i++) {
      // Offset by PI/4 so they start at nice angles instead of directly overlapping main roads
      const angle = (i / count) * Math.PI * 2 + (Math.PI / 4);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      layout.push([x, 0, z]);
    }
    return layout;
  };

  const renderContent = () => {
    if (viewLevel === 'CAMPUS') {
      const layout = getRadialLayout((campuses as any[]).length);
      return (campuses as any[]).map((c: any, i: number) => (
        <Campus3DPin
          key={c.id}
          position={layout[i] as [number, number, number]}
          name={c.name}
          address={c.address}
          schoolCount={allSchools.filter((s: any) => s.campusId === c.id).length}
          onClick={() => { setSelectedCampusId(c.id); setViewLevel('SCHOOL'); }}
        />
      ));
    }
    if (viewLevel === 'SCHOOL') {
      const displaySchools = selectedCampusId ? schools.filter((s: any) => s.campusId === selectedCampusId) : schools;
      const layout = getGridLayout(displaySchools.length, 16);
      return displaySchools.map((s: any, i: number) => (
        <SchoolBuilding3D
          key={s.id}
          position={layout[i] as [number, number, number]}
          name={s.name}
          campusName={s.campusName}
          classroomCount={s.classroomCount}
          deviceCount={s.deviceCount}
          onClick={() => { setSelectedSchoolId(s.id); setViewLevel('CLASSROOM'); }}
        />
      ));
    }
    if (viewLevel === 'CLASSROOM') {
      const hasUnassigned = devices.some((d: any) => !d.classroom);
      const displayClassrooms = hasUnassigned ? [...classrooms, { id: 'unassigned', name: 'Chưa phân lớp' }] : classrooms;
      const layout = getGridLayout(displayClassrooms.length, 6);
      return displayClassrooms.map((cr: any, i: number) => (
        <ClassroomModel key={cr.id} position={layout[i] as [number, number, number]} name={cr.name} activeDeviceCount={cr.id === 'unassigned' ? devices.filter((d: any) => !d.classroom && d.status === 'ONLINE').length : devices.filter((d: any) => d.classroom?.id === cr.id && d.status === 'ONLINE').length} onClick={(e: any) => { e.stopPropagation(); setSelectedClassroomId(cr.id); setViewLevel('DEVICE'); }} />
      ));
    }
    if (viewLevel === 'DEVICE') {
      const displayDevices = selectedClassroomId === 'unassigned'
        ? devices.filter((d: any) => !d.classroom)
        : devices.filter((d: any) => d.classroom?.id === selectedClassroomId);
      const crName = classrooms.find((c: any) => c.id === selectedClassroomId)?.name || (selectedClassroomId === 'unassigned' ? 'Chưa phân lớp' : 'Lớp học');
      return <DeviceClassroomView devices={displayDevices} classroomName={crName} />;
    }
    return null;
  };

  const isLoading = loadingCampuses || loadingSchools || loadingClassrooms || loadingDevices;
  const levelLabels = { CAMPUS: '📍 Bản đồ Khu vực', SCHOOL: '🏫 Trường học', CLASSROOM: '📚 Lớp học', DEVICE: '📱 Thiết bị' };
  const levelColors: Record<string, string> = { CAMPUS: '#00d4a0', SCHOOL: '#ffd700', CLASSROOM: '#10b981', DEVICE: '#3b82f6' };

  return (
    <div className="w-full flex flex-col" style={{ flex: 1, minHeight: 0, background: '#050507' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `1px solid ${levelColors[viewLevel]}20`, background: 'rgba(5,5,7,0.8)', backdropFilter: 'blur(16px)' }}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${levelColors[viewLevel]}33, ${levelColors[viewLevel]}15)`, border: `1px solid ${levelColors[viewLevel]}50` }}>
              <GlobalOutlined style={{ color: levelColors[viewLevel], fontSize: 16 }} />
            </div>
            <Title level={4} className="!m-0 !text-white" style={{ letterSpacing: '-0.02em' }}>Bản Đồ 3D Tương tác</Title>
          </div>
          <AntText className="font-mono-data" style={{ color: '#4b5563', fontSize: 11 }}>MDM › {levelLabels[viewLevel]}</AntText>
        </div>

        <div className="flex items-center gap-3">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            disabled={(viewLevel === 'CAMPUS') || (viewLevel === 'SCHOOL' && role !== 'SUPER_ADMIN') || (viewLevel === 'CLASSROOM' && role === 'TEACHER')}
            style={{ background: 'rgba(20,21,30,0.9)', border: '1px solid rgba(46,48,58,0.7)', color: '#9ca3af', borderRadius: 10 }}
          >
            Quay Lại
          </Button>

          {/* Level badges */}
          <div className="flex items-center gap-2">
            {(['CAMPUS', 'SCHOOL', 'CLASSROOM', 'DEVICE'] as const).map((level) => {
              const isActive = viewLevel === level;
              const color = levelColors[level];
              return (
                <div key={level} className="text-[10px] font-mono-data px-2.5 py-1 rounded-lg font-bold transition-all duration-300"
                  style={{
                    background: isActive ? `${color}20` : 'rgba(20,21,30,0.6)',
                    color: isActive ? color : '#4b5563',
                    border: `1px solid ${isActive ? `${color}60` : 'rgba(46,48,58,0.4)'}`,
                    boxShadow: isActive ? `0 0 12px ${color}30` : 'none',
                  }}>
                  {level}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-40 right-6 z-20 p-4 rounded-xl"
        style={{ background: 'rgba(5,5,7,0.85)', border: '1px solid rgba(170,59,255,0.15)', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <div className="text-[10px] font-mono-data font-bold mb-3" style={{ color: '#6b7280', letterSpacing: '0.1em' }}>LEGEND</div>
        {[
          { color: '#00d4a0', label: 'Khu vực' },
          { color: '#ffd700', label: 'Trường học' },
          { color: '#10b981', label: 'Lớp học' },
          { color: '#3b82f6', label: 'Thiết bị' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 mb-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span className="text-[11px]" style={{ color: '#9ca3af' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20"
            style={{ background: 'rgba(5,5,7,0.85)', backdropFilter: 'blur(8px)' }}>
            <Spin size="large" />
            <div className="mt-4 font-mono-data text-sm" style={{ color: levelColors[viewLevel] }}>Loading 3D Scene...</div>
          </div>
        )}
        <Canvas
          shadows
          camera={{ position: viewLevel === 'CAMPUS' ? [4, 32, 42] : [0, 20, 30], fov: viewLevel === 'CAMPUS' ? 42 : 42 }}
          style={{ background: 'transparent', width: '100%', height: '100%' }}
          gl={{ antialias: true, alpha: true }}>
          {/* Background — sky for CAMPUS, dark space for deeper levels */}
          {viewLevel === 'CAMPUS' ? (
            <>
              <color attach="background" args={['#a8d4f0']} />
              <fog attach="fog" args={['#c8e4f8', 65, 130]} />
            </>
          ) : (
            <>
              <color attach="background" args={['#020204']} />
              <fog attach="fog" args={['#020204', 50, 150]} />
            </>
          )}

          {/* Lighting */}
          {viewLevel === 'CAMPUS' ? (
            <>
              <ambientLight intensity={0.65} />
              <directionalLight position={[20, 35, 15]} intensity={1.8} castShadow color="#fff8f0" shadow-mapSize={[2048, 2048]} shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={60} shadow-camera-bottom={-60} />
              <directionalLight position={[-15, 20, -20]} intensity={0.5} color="#c8e0ff" />
              <hemisphereLight args={['#b8d4f0', '#6b8a50', 0.45]} />
            </>
          ) : (
            <>
              <ambientLight intensity={0.3} />
              <directionalLight position={[15, 25, 10]} intensity={1.8} castShadow color="#ffffff" shadow-mapSize={[2048, 2048]} />
              <pointLight position={[-15, 10, -10]} intensity={1.2} color={levelColors[viewLevel]} />
              <pointLight position={[10, 5, 15]} intensity={0.8} color="#ffffff" />
              <hemisphereLight args={['#0d0520', '#000000', 0.5]} />
            </>
          )}

          {/* Scene elements */}
          {viewLevel !== 'CAMPUS' && <Starfield />}
          {viewLevel === 'CAMPUS' ? <CampusMapGround /> : <GroundGrid level={viewLevel} />}
          {renderContent()}

          <OrbitControls
            makeDefault
            minDistance={viewLevel === 'CAMPUS' ? 8 : 4}
            maxDistance={viewLevel === 'CAMPUS' ? 75 : 70}
            minPolarAngle={viewLevel === 'CAMPUS' ? 0.15 : 0}
            maxPolarAngle={Math.PI / 2 - 0.02}
            enableDamping
            dampingFactor={0.07}
            target={viewLevel === 'CAMPUS' ? [0, 0, -2] : [0, 0, 0]}
          />
        </Canvas>

        {/* Bottom instruction */}
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(5,5,7,0.85)', border: `1px solid ${levelColors[viewLevel]}20`,
          borderRadius: 20, padding: '6px 16px', color: '#6b7280', fontSize: 11,
          backdropFilter: 'blur(12px)', fontFamily: 'monospace',
        }}>
          🖱️ Kéo để xoay · Cuộn để zoom · Click để drill-down
        </div>
      </div>
    </div>
  );
};
export default Map3DPage;
