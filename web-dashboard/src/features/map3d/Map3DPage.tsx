import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Html, Box, Sphere, Cylinder } from '@react-three/drei';
import { useQuery } from '@tanstack/react-query';
import { getAllCampuses, getSchools, getClassrooms } from '../../services/schoolService';
import { getDevices } from '../../services/deviceService';
import { useAuthStore } from '../../store/authStore';
import { Button, Typography, Spin, Breadcrumb, Card } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import * as THREE from 'three';

const { Title, Text: AntText } = Typography;

const CampusModel = ({ position, name, onClick }: any) => {
  const [hovered, setHover] = useState(false);
  return (
    <group position={position} onClick={onClick} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
      <Box args={[4, 1, 4]} material-color={hovered ? '#4f46e5' : '#3730a3'} />
      <Box args={[3, 2, 3]} position={[0, 1.5, 0]} material-color={hovered ? '#4338ca' : '#312e81'} />
      <Text position={[0, 3, 0]} fontSize={0.5} color="white" anchorX="center" anchorY="middle">{name}</Text>
    </group>
  );
};

const SchoolModel = ({ position, name, onClick }: any) => {
  const [hovered, setHover] = useState(false);
  return (
    <group position={position} onClick={onClick} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
      <Box args={[2.5, 0.5, 2.5]} material-color={hovered ? '#0ea5e9' : '#0369a1'} />
      <Cylinder args={[1, 1, 2, 8]} position={[0, 1.25, 0]} material-color={hovered ? '#0284c7' : '#075985'} />
      <Text position={[0, 2.8, 0]} fontSize={0.4} color="white" anchorX="center" anchorY="middle">{name}</Text>
    </group>
  );
};

const ClassroomModel = ({ position, name, onClick }: any) => {
  const [hovered, setHover] = useState(false);
  return (
    <group position={position} onClick={onClick} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
      <Box args={[1.5, 1, 1.5]} material-color={hovered ? '#10b981' : '#047857'} />
      <Text position={[0, 1.2, 0]} fontSize={0.3} color="white" anchorX="center" anchorY="middle">{name}</Text>
    </group>
  );
};


const DeviceModel = ({ position, name, status, onClick }: any) => {
  const [hovered, setHover] = useState(false);
  const color = status === 'ONLINE' ? '#22c55e' : status === 'OFFLINE' ? '#64748b' : status === 'WARNING' ? '#eab308' : '#ef4444';
  const yOffset = Math.sin(Date.now() / 300) * 0.1;

  return (
    <group position={[position[0], position[1] + yOffset, position[2]]} onClick={onClick} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
      <Box args={[0.5, 0.8, 0.2]} material-color={hovered ? '#cbd5e1' : '#94a3b8'} />
      <Box args={[0.4, 0.7, 0.22]} position={[0, 0, 0]} material-color="#0f172a" />
      <Sphere args={[0.05, 16, 16]} position={[0, 0.45, 0.1]} material-color={color} />
      <Html position={[0, 1, 0]} center style={{ transition: 'opacity 0.2s', opacity: hovered ? 1 : 0, pointerEvents: 'none' }}>
        <div className="bg-[#1f2028]/90 backdrop-blur border border-[#2e303a] p-2 rounded shadow-xl whitespace-nowrap min-w-[120px]">
          <div className="text-white font-bold text-xs mb-1">{name}</div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-300 text-[10px]">{status}</span>
          </div>
        </div>
      </Html>
    </group>
  );
};

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
      const layout = getGridLayout((campuses as any[]).length, 10);
      return (campuses as any[]).map((c: any, i: number) => (
        <CampusModel key={c.id} position={layout[i]} name={c.name} onClick={(e: any) => { e.stopPropagation(); setSelectedCampusId(c.id); setViewLevel('SCHOOL'); }} />
      ));
    }
    if (viewLevel === 'SCHOOL') {
      const displaySchools = selectedCampusId ? schools.filter((s: any) => s.campusId === selectedCampusId) : schools;
      const layout = getGridLayout(displaySchools.length, 8);
      return displaySchools.map((s: any, i: number) => (
        <SchoolModel key={s.id} position={layout[i]} name={s.name} onClick={(e: any) => { e.stopPropagation(); setSelectedSchoolId(s.id); setViewLevel('CLASSROOM'); }} />
      ));
    }
    if (viewLevel === 'CLASSROOM') {
      const hasUnassigned = devices.some((d: any) => !d.classroom);
      const displayClassrooms = hasUnassigned ? [...classrooms, { id: 'unassigned', name: 'Chưa phân lớp' }] : classrooms;
      const layout = getGridLayout(displayClassrooms.length, 5);
      return displayClassrooms.map((cr: any, i: number) => (
        <ClassroomModel key={cr.id} position={layout[i]} name={cr.name} onClick={(e: any) => { e.stopPropagation(); setSelectedClassroomId(cr.id); setViewLevel('DEVICE'); }} />
      ));
    }
    if (viewLevel === 'DEVICE') {
      const displayDevices = selectedClassroomId === 'unassigned'
        ? devices.filter((d: any) => !d.classroom)
        : devices.filter((d: any) => d.classroom?.id === selectedClassroomId);
      const layout = getGridLayout(displayDevices.length, 2);
      return displayDevices.map((d: any, i: number) => (
        <DeviceModel key={d.id} position={[layout[i][0], 0.5, layout[i][2]]} name={d.deviceName || d.model} status={d.status} onClick={(e: any) => { e.stopPropagation(); }} />
      ));
    }
    return null;
  };

  const isLoading = loadingCampuses || loadingSchools || loadingClassrooms || loadingDevices;

  return (
    <div className="h-full w-full relative flex flex-col p-6">
      <div className="flex justify-between items-center mb-4 z-10">
        <div>
          <Title level={3} className="!m-0 !text-white">Bản Đồ 3D</Title>
          <AntText className="text-gray-400 mt-1">Khám phá không gian thực tế ảo của hệ thống thiết bị</AntText>
        </div>
      </div>
      <div className="flex items-center gap-4 mb-4 z-10">
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack} disabled={(viewLevel === 'CAMPUS') || (viewLevel === 'SCHOOL' && role !== 'SUPER_ADMIN') || (viewLevel === 'CLASSROOM' && role === 'TEACHER')} className="bg-[#1f2028] border-[#2e303a] text-white hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]">
          Quay Lại
        </Button>
        <Breadcrumb separator=">" className="text-gray-400 bg-[#16171d] px-4 py-2 rounded-lg border border-[#2e303a]">
          {role === 'SUPER_ADMIN' && <Breadcrumb.Item className={viewLevel === 'CAMPUS' ? 'text-white font-bold' : ''}>Tất cả Cơ sở</Breadcrumb.Item>}
          {(viewLevel === 'SCHOOL' || viewLevel === 'CLASSROOM' || viewLevel === 'DEVICE') && <Breadcrumb.Item className={viewLevel === 'SCHOOL' ? 'text-white font-bold' : ''}>Trường học</Breadcrumb.Item>}
          {(viewLevel === 'CLASSROOM' || viewLevel === 'DEVICE') && <Breadcrumb.Item className={viewLevel === 'CLASSROOM' ? 'text-white font-bold' : ''}>Lớp học</Breadcrumb.Item>}
          {viewLevel === 'DEVICE' && <Breadcrumb.Item className="text-white font-bold">Thiết bị</Breadcrumb.Item>}
        </Breadcrumb>
      </div>
      <Card className="flex-1 bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg p-0 overflow-hidden relative body-no-padding min-h-[600px]">
        {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-[#16171d]/80 z-20 backdrop-blur-sm"><Spin size="large" /></div>}
        <div className="absolute top-4 right-4 z-20 bg-[#1f2028]/80 backdrop-blur p-3 rounded-lg border border-[#2e303a] shadow-lg pointer-events-none">
          <AntText className="text-gray-300 text-xs flex items-center gap-2"><div className="w-4 h-4 bg-[#3730a3] rounded-sm"></div> Cơ sở</AntText>
          <AntText className="text-gray-300 text-xs flex items-center gap-2 mt-1"><div className="w-4 h-4 bg-[#0369a1] rounded-sm"></div> Trường học</AntText>
          <AntText className="text-gray-300 text-xs flex items-center gap-2 mt-1"><div className="w-4 h-4 bg-[#047857] rounded-sm"></div> Lớp học</AntText>
          <AntText className="text-gray-300 text-xs flex items-center gap-2 mt-1"><div className="w-4 h-4 bg-[#94a3b8] rounded-sm"></div> Thiết bị</AntText>
        </div>
        <Canvas camera={{ position: [0, 15, 20], fov: 45 }} className="w-full h-full bg-[#0a0a0f]" style={{ height: '600px' }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          <gridHelper args={[100, 100, '#1f2937', '#111827']} position={[0, -0.01, 0]} />
          {renderContent()}
          <OrbitControls makeDefault minDistance={2} maxDistance={50} maxPolarAngle={Math.PI / 2 - 0.05} />
        </Canvas>
      </Card>
    </div>
  );
};
export default Map3DPage;
