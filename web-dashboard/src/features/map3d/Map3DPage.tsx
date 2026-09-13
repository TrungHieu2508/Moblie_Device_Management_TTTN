import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import { useQuery } from '@tanstack/react-query';
import { getAllCampuses, getSchools, getClassrooms } from '../../services/schoolService';
import { getDevices } from '../../services/deviceService';
import { useAuthStore } from '../../store/authStore';
import { Button, Typography, Spin } from 'antd';
import { ArrowLeftOutlined, GlobalOutlined } from '@ant-design/icons';
import * as THREE from 'three';

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

// ─── Hex Grid ──────────────────────────────────────────────────────
const HexGrid = () => {
  return (
    <group position={[0, -0.02, 0]}>
      <gridHelper args={[120, 60, '#1a0a2e', '#0d0718']} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#050507" transparent opacity={0.85} />
      </mesh>
    </group>
  );
};

// ─── Animated ring component ───────────────────────────────────────
const AnimatedRing = ({ color, radius, speed = 1, y = 0 }: any) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * speed; });
  return (
    <mesh ref={ref} position={[0, y, 0]}>
      <torusGeometry args={[radius, 0.03, 8, 64]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} transparent opacity={0.7} />
    </mesh>
  );
};

// ─── CampusModel — 3D Holographic Campus ──────────────────────────
const CampusModel = ({ position, name, onClick }: any) => {
  const [hovered, setHover] = useState(false);
  const groupRef = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(Date.now() * 0.001) * 0.15;
    }
  });
  return (
    <group ref={groupRef} position={position} onClick={onClick}
      onPointerOver={() => { setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'default'; }}>
      {/* Base platform */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[2.8, 3.2, 0.4, 8]} />
        <meshStandardMaterial color="#1a0a2e" emissive={hovered ? '#aa3bff' : '#3a1a6e'} emissiveIntensity={hovered ? 1.5 : 0.6} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Main body */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[3, 2.5, 3]} />
        <meshStandardMaterial color="#0d0720" emissive={hovered ? '#7b2ae8' : '#2d1460'} emissiveIntensity={hovered ? 1.2 : 0.5} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Top spire */}
      <mesh position={[0, 3.3, 0]} castShadow>
        <coneGeometry args={[0.8, 1.5, 6]} />
        <meshStandardMaterial color="#aa3bff" emissive="#aa3bff" emissiveIntensity={hovered ? 3 : 1.5} />
      </mesh>
      {/* Glowing top orb */}
      <mesh position={[0, 4.3, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#aa3bff" emissiveIntensity={4} />
      </mesh>
      {/* Rotating rings */}
      <AnimatedRing color={hovered ? '#d4a0ff' : '#aa3bff'} radius={2.5} speed={0.8} y={1.5} />
      <AnimatedRing color={hovered ? '#00d4ff' : '#6b28cc'} radius={3.2} speed={-0.5} y={0.8} />
      {/* Point lights for glow */}
      {hovered && <pointLight color="#aa3bff" intensity={4} distance={8} position={[0, 2, 0]} />}
      {/* Label */}
      <Text position={[0, 5.2, 0]} fontSize={0.55} color={hovered ? '#d4a0ff' : '#e2d4ff'} anchorX="center" anchorY="middle"
        outlineColor="#000" outlineWidth={0.02}>{name}</Text>
      {/* Hover tooltip */}
      {hovered && (
        <Html position={[0, 6.5, 0]} center distanceFactor={10}>
          <div style={{ background: 'rgba(10,5,20,0.95)', border: '1px solid rgba(170,59,255,0.5)', borderRadius: 12, padding: '10px 16px', color: '#e2d4ff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 0 30px rgba(170,59,255,0.3)' }}>
            🏛️ {name} — Click để xem trường học
          </div>
        </Html>
      )}
    </group>
  );
};

// ─── SchoolModel — 3D School Tower ────────────────────────────────
const SchoolModel = ({ position, name, onClick }: any) => {
  const [hovered, setHover] = useState(false);
  const groupRef = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (groupRef.current) groupRef.current.position.y = position[1] + Math.sin(Date.now() * 0.0012 + position[0]) * 0.12;
  });
  return (
    <group ref={groupRef} position={position} onClick={onClick}
      onPointerOver={() => { setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'default'; }}>
      {/* Base */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[2.5, 0.35, 2.5]} />
        <meshStandardMaterial color="#001a2e" emissive={hovered ? '#00d4ff' : '#003d6e'} emissiveIntensity={hovered ? 1.2 : 0.5} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Main cylinder */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.9, 1.1, 2.4, 12]} />
        <meshStandardMaterial color="#001525" emissive={hovered ? '#0099cc' : '#005580'} emissiveIntensity={hovered ? 1.2 : 0.5} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Dome top */}
      <mesh position={[0, 2.8, 0]} castShadow>
        <sphereGeometry args={[0.95, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={hovered ? 2.5 : 1.2} transparent opacity={0.85} metalness={0.5} />
      </mesh>
      {/* Rotating ring */}
      <AnimatedRing color={hovered ? '#80eaff' : '#00d4ff'} radius={1.6} speed={1.2} y={1.4} />
      {hovered && <pointLight color="#00d4ff" intensity={3} distance={6} position={[0, 1.5, 0]} />}
      <Text position={[0, 3.9, 0]} fontSize={0.42} color={hovered ? '#80eaff' : '#b0f0ff'} anchorX="center" anchorY="middle" outlineColor="#000" outlineWidth={0.02}>{name}</Text>
      {hovered && (
        <Html position={[0, 5, 0]} center distanceFactor={10}>
          <div style={{ background: 'rgba(0,15,30,0.95)', border: '1px solid rgba(0,212,255,0.5)', borderRadius: 10, padding: '8px 14px', color: '#b0f0ff', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}>
            🏫 {name} — Click để xem lớp học
          </div>
        </Html>
      )}
    </group>
  );
};

// ─── ClassroomModel — 3D Room Box ────────────────────────────────
const ClassroomModel = ({ position, name, onClick }: any) => {
  const [hovered, setHover] = useState(false);
  const groupRef = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (groupRef.current) groupRef.current.position.y = position[1] + Math.sin(Date.now() * 0.0015 + position[2]) * 0.1;
  });
  return (
    <group ref={groupRef} position={position} onClick={onClick}
      onPointerOver={() => { setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'default'; }}>
      {/* Main box */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[1.6, 1.2, 1.6]} />
        <meshStandardMaterial color="#001a10" emissive={hovered ? '#00ff88' : '#006644'} emissiveIntensity={hovered ? 1.2 : 0.4} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <coneGeometry args={[1.2, 0.7, 4]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={hovered ? 2 : 0.8} />
      </mesh>
      {/* Windows glow */}
      {[-0.4, 0.4].map((x, i) => (
        <mesh key={i} position={[x, 0.7, 0.82]}>
          <boxGeometry args={[0.35, 0.35, 0.05]} />
          <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={hovered ? 4 : 2} transparent opacity={0.9} />
        </mesh>
      ))}
      {hovered && <pointLight color="#10b981" intensity={3} distance={5} position={[0, 1, 0]} />}
      <Text position={[0, 2.6, 0]} fontSize={0.36} color={hovered ? '#86efac' : '#6ee7b7'} anchorX="center" anchorY="middle" outlineColor="#000" outlineWidth={0.02}>{name}</Text>
      {hovered && (
        <Html position={[0, 3.3, 0]} center distanceFactor={10}>
          <div style={{ background: 'rgba(0,15,8,0.95)', border: '1px solid rgba(74,222,128,0.5)', borderRadius: 10, padding: '8px 14px', color: '#86efac', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 0 20px rgba(74,222,128,0.3)' }}>
            📚 {name} — Click để xem thiết bị
          </div>
        </Html>
      )}
    </group>
  );
};

// ─── DeviceModel — Holographic Android ───────────────────────────
const DeviceModel = ({ position, name, status, onClick }: any) => {
  const [hovered, setHover] = useState(false);
  const groupRef = useRef<THREE.Group>(null!);
  const colorMap: Record<string, string> = { ONLINE: '#22c55e', OFFLINE: '#64748b', WARNING: '#eab308', CRITICAL: '#ef4444' };
  const statusColor = colorMap[status] || '#64748b';
  useFrame(() => {
    if (groupRef.current) groupRef.current.position.y = position[1] + Math.sin(Date.now() * 0.002 + position[0] * 3) * 0.15;
  });
  return (
    <group ref={groupRef} position={position} onClick={onClick}
      onPointerOver={() => { setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'default'; }}>
      {/* Phone body */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.55, 0.95, 0.12]} />
        <meshStandardMaterial color="#1a1f2e" emissive={hovered ? '#334155' : '#1e293b'} emissiveIntensity={0.6} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 0.05, 0.07]}>
        <boxGeometry args={[0.45, 0.78, 0.01]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={hovered ? 3 : 1.5} transparent opacity={0.9} />
      </mesh>
      {/* Home button */}
      <mesh position={[0, -0.42, 0.07]}>
        <circleGeometry args={[0.05, 16]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={2} />
      </mesh>
      {/* Status halo */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.03, 8, 32]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={status === 'ONLINE' ? 3 : 1} transparent opacity={0.8} />
      </mesh>
      {status === 'ONLINE' && <pointLight color={statusColor} intensity={1.5} distance={3} position={[0, 0, 0]} />}
      {/* Tooltip */}
      <Html position={[0, 1.3, 0]} center style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
        <div style={{ background: 'rgba(10,12,20,0.95)', border: `1px solid ${statusColor}66`, borderRadius: 10, padding: '8px 14px', color: '#e2e8f0', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: `0 0 20px ${statusColor}33`, minWidth: 130 }}>
          <div style={{ marginBottom: 4 }}>📱 {name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
            <span style={{ color: statusColor, fontSize: 11 }}>{status}</span>
          </div>
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
  const { data: classrooms = [], isLoading: loadingClassrooms } = useQuery({ queryKey: ['classrooms', selectedSchoolId], queryFn: () => getClassrooms(selectedSchoolId as string), enabled: (viewLevel === 'CLASSROOM' || role === 'TEACHER') && !!selectedSchoolId });
  const { data: devicesData, isLoading: loadingDevices } = useQuery({ queryKey: ['devices_map', selectedSchoolId], queryFn: () => getDevices({ page: 0, size: 500, schoolId: selectedSchoolId || undefined }), enabled: (viewLevel === 'CLASSROOM' || viewLevel === 'DEVICE') && !!selectedSchoolId });
  const devices = devicesData?.content || [];

  const handleBack = () => {
    if (viewLevel === 'DEVICE') { setViewLevel('CLASSROOM'); setSelectedClassroomId(null); }
    else if (viewLevel === 'CLASSROOM') { if (role === 'TEACHER') return; setViewLevel('SCHOOL'); setSelectedSchoolId(null); }
    else if (viewLevel === 'SCHOOL') { if (role !== 'SUPER_ADMIN') return; setViewLevel('CAMPUS'); setSelectedCampusId(null); }
  };

  const getGridLayout = (count: number, spacing: number) => {
    const cols = Math.ceil(Math.sqrt(count));
    const layout = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      layout.push([(col - (cols - 1) / 2) * spacing, 0, (row - (Math.ceil(count / cols) - 1) / 2) * spacing]);
    }
    return layout;
  };

  const renderContent = () => {
    if (viewLevel === 'CAMPUS') {
      const layout = getGridLayout((campuses as any[]).length, 12);
      return (campuses as any[]).map((c: any, i: number) => (
        <CampusModel key={c.id} position={layout[i]} name={c.name} onClick={(e: any) => { e.stopPropagation(); setSelectedCampusId(c.id); setViewLevel('SCHOOL'); }} />
      ));
    }
    if (viewLevel === 'SCHOOL') {
      const displaySchools = selectedCampusId ? schools.filter((s: any) => s.campusId === selectedCampusId) : schools;
      const layout = getGridLayout(displaySchools.length, 10);
      return displaySchools.map((s: any, i: number) => (
        <SchoolModel key={s.id} position={layout[i]} name={s.name} onClick={(e: any) => { e.stopPropagation(); setSelectedSchoolId(s.id); setViewLevel('CLASSROOM'); }} />
      ));
    }
    if (viewLevel === 'CLASSROOM') {
      const hasUnassigned = devices.some((d: any) => !d.classroom);
      const displayClassrooms = hasUnassigned ? [...classrooms, { id: 'unassigned', name: 'Chưa phân lớp' }] : classrooms;
      const layout = getGridLayout(displayClassrooms.length, 6);
      return displayClassrooms.map((cr: any, i: number) => (
        <ClassroomModel key={cr.id} position={layout[i]} name={cr.name} onClick={(e: any) => { e.stopPropagation(); setSelectedClassroomId(cr.id); setViewLevel('DEVICE'); }} />
      ));
    }
    if (viewLevel === 'DEVICE') {
      const displayDevices = selectedClassroomId === 'unassigned'
        ? devices.filter((d: any) => !d.classroom)
        : devices.filter((d: any) => d.classroom?.id === selectedClassroomId);
      const layout = getGridLayout(displayDevices.length, 2.5);
      return displayDevices.map((d: any, i: number) => (
        <DeviceModel key={d.id} position={[layout[i][0], 0.5, layout[i][2]]} name={d.deviceName || d.model} status={d.status} onClick={(e: any) => { e.stopPropagation(); }} />
      ));
    }
    return null;
  };

  const isLoading = loadingCampuses || loadingSchools || loadingClassrooms || loadingDevices;
  const levelLabels = { CAMPUS: '🏛️ Tất cả Cơ sở', SCHOOL: '🏫 Trường học', CLASSROOM: '📚 Lớp học', DEVICE: '📱 Thiết bị' };

  return (
    <div className="h-full w-full flex flex-col" style={{ minHeight: '100vh', background: '#050507' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(170,59,255,0.12)', background: 'rgba(5,5,7,0.8)', backdropFilter: 'blur(16px)' }}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(170,59,255,0.2))', border: '1px solid rgba(0,212,255,0.3)' }}>
              <GlobalOutlined style={{ color: '#00d4ff', fontSize: 16 }} />
            </div>
            <Title level={4} className="!m-0 !text-white" style={{ letterSpacing: '-0.02em' }}>Bản Đồ 3D Holographic</Title>
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
              return (
                <div key={level} className="text-[10px] font-mono-data px-2.5 py-1 rounded-lg font-bold transition-all duration-300"
                  style={{
                    background: isActive ? 'rgba(170,59,255,0.2)' : 'rgba(20,21,30,0.6)',
                    color: isActive ? '#aa3bff' : '#4b5563',
                    border: `1px solid ${isActive ? 'rgba(170,59,255,0.4)' : 'rgba(46,48,58,0.4)'}`,
                    boxShadow: isActive ? '0 0 12px rgba(170,59,255,0.25)' : 'none',
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
          { color: '#aa3bff', label: 'Cơ sở' },
          { color: '#00d4ff', label: 'Trường học' },
          { color: '#10b981', label: 'Lớp học' },
          { color: '#94a3b8', label: 'Thiết bị' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 mb-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span className="text-[11px]" style={{ color: '#9ca3af' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative" style={{ minHeight: 600 }}>
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20"
            style={{ background: 'rgba(5,5,7,0.85)', backdropFilter: 'blur(8px)' }}>
            <Spin size="large" />
            <div className="mt-4 font-mono-data text-sm" style={{ color: '#aa3bff' }}>Loading 3D Scene...</div>
          </div>
        )}
        <Canvas
          shadows
          camera={{ position: [0, 18, 25], fov: 45 }}
          style={{ background: 'transparent', height: '100%', minHeight: 600 }}
          gl={{ antialias: true, alpha: true }}>
          {/* Background */}
          <color attach="background" args={['#020204']} />
          <fog attach="fog" args={['#020204', 40, 120]} />

          {/* Professional 3-point lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight position={[15, 25, 10]} intensity={1.8} castShadow color="#ffffff" shadow-mapSize={[2048, 2048]} />
          <pointLight position={[-15, 10, -10]} intensity={1.2} color="#aa3bff" />
          <pointLight position={[10, 5, 15]} intensity={0.8} color="#00d4ff" />
          <hemisphereLight args={['#0d0520', '#000000', 0.5]} />

          {/* Scene elements */}
          <Starfield />
          <HexGrid />
          {renderContent()}

          <OrbitControls makeDefault minDistance={3} maxDistance={60} maxPolarAngle={Math.PI / 2 - 0.05} enableDamping dampingFactor={0.05} />
        </Canvas>
      </div>
    </div>
  );
};
export default Map3DPage;

