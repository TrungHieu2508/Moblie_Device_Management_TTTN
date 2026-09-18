import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Button, Modal, Form, Input, Typography, message, Popconfirm, Tooltip, Spin, Tag } from 'antd';
import { PlusOutlined, EnvironmentOutlined, DeleteOutlined, EditOutlined, TableOutlined, GlobalOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllCampuses, createCampus, deleteCampus, updateCampus } from '../../../services/schoolService';
import { getSchools } from '../../../services/schoolService';
import { Campus3DPin } from '../../../components/3d/Campus3DPin';

const { Title } = Typography;

// ─── Pin colors (Google Maps palette) ─────────────────────────────
const PIN_COLORS = ['#EA4335', '#1A73E8', '#FBBC04', '#34A853', '#9C27B0', '#FF6D00'];

// ─── Compute spread positions on the map ──────────────────────────
const getMapPositions = (count: number): [number, number, number][] => {
  // Spread pins in different city zones, not in a rigid grid
  const presets: [number, number, number][] = [
    [-14, 0, -10],
    [10, 0, -14],
    [-6, 0, 12],
    [18, 0, 6],
    [-20, 0, 2],
    [4, 0, -4],
    [22, 0, -8],
    [-12, 0, 18],
  ];
  return presets.slice(0, count);
};

// ─── City building block ───────────────────────────────────────────
const CityBlock = ({
  x, z, w, d, h, color, roofColor,
}: {
  x: number; z: number; w: number; d: number; h: number;
  color: string; roofColor: string;
}) => (
  <group position={[x, 0, z]}>
    {/* Body */}
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={0.75} metalness={0.05} />
    </mesh>
    {/* Flat roof accent */}
    <mesh position={[0, h + 0.04, 0]}>
      <boxGeometry args={[w + 0.04, 0.08, d + 0.04]} />
      <meshStandardMaterial color={roofColor} roughness={0.6} metalness={0.1} />
    </mesh>
  </group>
);

// ─── Road segment ─────────────────────────────────────────────────
const Road = ({ x, z, w, d }: { x: number; z: number; w: number; d: number }) => (
  <mesh position={[x, 0.005, z]} receiveShadow>
    <boxGeometry args={[w, 0.01, d]} />
    <meshStandardMaterial color="#3a3a3a" roughness={0.95} />
  </mesh>
);

// ─── Road center line dashes ───────────────────────────────────────
const RoadLine = ({ x, z, length, horizontal }: { x: number; z: number; length: number; horizontal: boolean }) => {
  const dashes = Math.floor(length / 2.4);
  return (
    <>
      {Array.from({ length: dashes }).map((_, i) => {
        const offset = (i - (dashes - 1) / 2) * 2.4;
        return (
          <mesh key={i} position={[
            horizontal ? x + offset : x,
            0.02,
            horizontal ? z : z + offset
          ]} receiveShadow>
            <boxGeometry args={horizontal ? [1.2, 0.01, 0.08] : [0.08, 0.01, 1.2]} />
            <meshStandardMaterial color="#e0c060" roughness={0.9} transparent opacity={0.7} />
          </mesh>
        );
      })}
    </>
  );
};

// ─── Park patch ───────────────────────────────────────────────────
const Park = ({ x, z, w, d }: { x: number; z: number; w: number; d: number }) => (
  <mesh position={[x, 0.015, z]} receiveShadow>
    <boxGeometry args={[w, 0.01, d]} />
    <meshStandardMaterial color="#3a7d44" roughness={0.95} />
  </mesh>
);

// ─── Simple 3D tree for parks ─────────────────────────────────────
const MapTree = ({ x, z }: { x: number; z: number }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, 0.35, 0]}>
      <cylinderGeometry args={[0.06, 0.08, 0.7, 6]} />
      <meshStandardMaterial color="#6b4226" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.9, 0]}>
      <sphereGeometry args={[0.38, 10, 10]} />
      <meshStandardMaterial color="#2d7a3a" roughness={0.85} />
    </mesh>
  </group>
);

import { CampusMapGround } from '../../../components/3d/CampusMapGround';

// ─── The City Map Scene ────────────────────────────────────────────
const CityMap = ({ campuses, selectedCampusId, schools, onPinClick }: {
  campuses: any[];
  selectedCampusId: string | null;
  schools: any[];
  onPinClick: (id: string) => void;
}) => {
  const positions = useMemo(() => getMapPositions(campuses.length), [campuses.length]);

  return (
    <>
      {/* ── Lighting ── */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[20, 35, 15]} intensity={1.8}
        castShadow color="#fff8f0"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <directionalLight position={[-15, 20, -20]} intensity={0.5} color="#c8e0ff" />
      <hemisphereLight args={['#b8d4f0', '#6b8a50', 0.5]} />

      {/* ── High-detail Procedural City Ground ── */}
      <CampusMapGround />

      {/* ── Campus Pins ── */}
      {campuses.map((campus: any, i: number) => (
        <Campus3DPin
          key={campus.id}
          position={positions[i] ?? [i * 8, 0, 0]}
          name={campus.name}
          address={campus.address}
          schoolCount={schools.filter((s: any) => s.campusId === campus.id).length}
          isSelected={selectedCampusId === campus.id}
          color={PIN_COLORS[i % PIN_COLORS.length]}
          onClick={() => onPinClick(campus.id)}
        />
      ))}
    </>
  );
};

// ─── CampusListPage ────────────────────────────────────────────────
const CampusListPage = () => {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'table'>('3d');
  const [form] = Form.useForm();

  const { data: campuses = [], isLoading } = useQuery({
    queryKey: ['campuses'],
    queryFn: () => getAllCampuses(),
  });

  const { data: schoolsData } = useQuery({
    queryKey: ['schools', { size: 200 }],
    queryFn: () => getSchools({ page: 0, size: 200 }),
  });
  const schools = schoolsData?.content || [];

  const createMutation = useMutation({
    mutationFn: (values: any) => createCampus(values),
    onSuccess: () => { message.success('Đã thêm khu vực mới!'); handleModalClose(); queryClient.invalidateQueries({ queryKey: ['campuses'] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Không thể tạo khu vực'),
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => updateCampus(editingId as string, values),
    onSuccess: () => { message.success('Đã cập nhật!'); handleModalClose(); queryClient.invalidateQueries({ queryKey: ['campuses'] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Không thể cập nhật'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCampus(id),
    onSuccess: () => { message.success('Đã xóa!'); setSelectedCampusId(null); queryClient.invalidateQueries({ queryKey: ['campuses'] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Không thể xóa'),
  });

  const handleModalClose = () => { setIsModalVisible(false); setEditingId(null); form.resetFields(); };
  const handleEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({ name: record.name, code: record.code, address: record.address });
    setIsModalVisible(true);
  };

  const selectedCampus = (campuses as any[]).find((c: any) => c.id === selectedCampusId);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#1a1a2e' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(15,15,25,0.95)', backdropFilter: 'blur(20px)', flexShrink: 0,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg,#EA4335,#FBBC04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(234,67,53,0.4)',
            }}>
              <EnvironmentOutlined style={{ color: '#fff', fontSize: 15 }} />
            </div>
            <Title level={4} style={{ margin: 0, color: '#fff' }}>Quản lý Khu vực (Campus)</Title>
          </div>
          <p style={{ margin: '3px 0 0 42px', color: '#9aa0a6', fontSize: 12 }}>
            Bản đồ 3D · {(campuses as any[]).length} khu vực · {schools.length} trường học
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
            {[{ key: '3d', icon: <GlobalOutlined />, label: '3D Map' }, { key: 'table', icon: <TableOutlined />, label: 'Bảng' }].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key as any)}
                style={{
                  background: viewMode === key ? 'rgba(234,67,53,0.2)' : 'transparent',
                  color: viewMode === key ? '#EA4335' : '#9aa0a6',
                  border: 'none', cursor: 'pointer', padding: '6px 14px',
                  fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all 0.2s',
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
            style={{ background: '#EA4335', border: 'none', height: 38, borderRadius: 10, fontWeight: 600 }}
          >
            Thêm Khu vực
          </Button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {viewMode === '3d' ? (
          <>
            {/* ── 3D Canvas ── */}
            <div style={{ flex: 1, position: 'relative' }}>
              {isLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,15,25,0.9)', zIndex: 20 }}>
                  <div style={{ textAlign: 'center' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 12, color: '#EA4335', fontFamily: 'monospace', fontSize: 12 }}>Loading 3D Map...</div>
                  </div>
                </div>
              )}

              <Canvas
                shadows
                camera={{ position: [4, 32, 42], fov: 42 }}
                style={{ background: 'transparent', width: '100%', height: '100%' }}
                gl={{ antialias: true, alpha: true }}
              >
                <color attach="background" args={['#a8d4f0']} />
                <fog attach="fog" args={['#c8e4f8', 65, 130]} />

                <CityMap
                  campuses={campuses as any[]}
                  selectedCampusId={selectedCampusId}
                  schools={schools}
                  onPinClick={(id) => setSelectedCampusId(prev => prev === id ? null : id)}
                />

                <OrbitControls
                  makeDefault
                  minDistance={8}
                  maxDistance={75}
                  minPolarAngle={0.15}
                  maxPolarAngle={Math.PI / 2 - 0.02}
                  enableDamping
                  dampingFactor={0.07}
                  target={[0, 0, -2]}
                />
              </Canvas>

              {/* HUD stats */}
              <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
                {[
                  { label: 'Khu vực', count: (campuses as any[]).length, color: '#EA4335' },
                  { label: 'Trường học', count: schools.length, color: '#34A853' },
                ].map(({ label, count, color }) => (
                  <div key={label} style={{
                    background: 'rgba(255,255,255,0.92)',
                    borderRadius: 10, padding: '8px 16px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                    backdropFilter: 'blur(10px)',
                  }}>
                    <div style={{ color, fontSize: 20, fontWeight: 800, fontFamily: 'Google Sans, system-ui' }}>{count}</div>
                    <div style={{ color: '#5f6368', fontSize: 11 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Controls hint */}
              <div style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: '6px 18px',
                color: '#5f6368', fontSize: 11, boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                fontFamily: 'Google Sans, system-ui', backdropFilter: 'blur(8px)',
              }}>
                🖱️ Kéo để xoay · Cuộn để zoom · Click pin để xem chi tiết
              </div>
            </div>

            {/* ── Right panel (Google Maps info panel style) ── */}
            <div style={{
              width: 300, background: '#ffffff', borderLeft: '1px solid #e0e0e0',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              fontFamily: 'Google Sans, system-ui, sans-serif',
            }}>
              {/* Selected campus info */}
              {selectedCampus ? (
                <div style={{ padding: 20, borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: '#EA4335', fontWeight: 700, letterSpacing: '0.1em' }}>ĐỊA ĐIỂM ĐÃ CHỌN</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Tooltip title="Sửa"><Button size="small" type="text" icon={<EditOutlined />} style={{ color: '#1A73E8' }} onClick={() => handleEdit(selectedCampus)} /></Tooltip>
                      <Popconfirm title="Xóa khu vực?" onConfirm={() => deleteMutation.mutate(selectedCampus.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                        <Tooltip title="Xóa"><Button size="small" type="text" icon={<DeleteOutlined />} danger /></Tooltip>
                      </Popconfirm>
                    </div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#202124', marginBottom: 4 }}>{selectedCampus.name}</div>
                  <Tag style={{ background: '#f1f3f4', color: '#5f6368', border: 'none', borderRadius: 6, fontSize: 11 }}>{selectedCampus.code}</Tag>
                  {selectedCampus.address && (
                    <div style={{ color: '#5f6368', fontSize: 12, marginTop: 8, display: 'flex', gap: 6 }}>
                      <span>📍</span><span>{selectedCampus.address}</span>
                    </div>
                  )}
                  <div style={{
                    marginTop: 12, background: '#E8F5E9', borderRadius: 10, padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{ fontSize: 24 }}>🏫</div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#2E7D32' }}>
                        {schools.filter((s: any) => s.campusId === selectedCampus.id).length}
                      </div>
                      <div style={{ fontSize: 11, color: '#4CAF50' }}>Trường học</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 24, borderBottom: '1px solid #f0f0f0', textAlign: 'center', color: '#9aa0a6' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📍</div>
                  <div style={{ fontSize: 13, color: '#5f6368' }}>Click vào pin trên bản đồ để xem thông tin khu vực</div>
                </div>
              )}

              {/* Campus list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                <div style={{ padding: '8px 16px', color: '#9aa0a6', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>
                  TẤT CẢ KHU VỰC ({(campuses as any[]).length})
                </div>
                {(campuses as any[]).map((campus: any, i: number) => {
                  const isActive = campus.id === selectedCampusId;
                  const color = PIN_COLORS[i % PIN_COLORS.length];
                  return (
                    <div
                      key={campus.id}
                      onClick={() => setSelectedCampusId(isActive ? null : campus.id)}
                      style={{
                        padding: '12px 16px', cursor: 'pointer', transition: 'background 0.15s',
                        background: isActive ? '#e8f0fe' : 'transparent',
                        borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{i + 1}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#202124', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {campus.name}
                          </div>
                          <div style={{ color: '#9aa0a6', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {campus.address}
                          </div>
                        </div>
                        <span style={{ color: '#9aa0a6', fontSize: 11, fontFamily: 'monospace', flexShrink: 0 }}>{campus.code}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* ── Table view ── */
          <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#f8f9fa' }}>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                    {['#', 'Tên Khu vực', 'Mã', 'Địa chỉ', 'Số trường', 'Hành động'].map(h => (
                      <th key={h} style={{ color: '#5f6368', fontSize: 12, fontWeight: 600, textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid #e0e0e0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center' }}><Spin /></td></tr>
                  ) : (campuses as any[]).map((campus: any, i: number) => (
                    <tr key={campus.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: PIN_COLORS[i % PIN_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#202124' }}>{campus.name}</td>
                      <td style={{ padding: '12px 14px', color: '#5f6368', fontFamily: 'monospace' }}>{campus.code}</td>
                      <td style={{ padding: '12px 14px', color: '#5f6368', fontSize: 12 }}>{campus.address}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#34A853' }}>{schools.filter((s: any) => s.campusId === campus.id).length}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Tooltip title="Sửa"><Button type="text" icon={<EditOutlined />} style={{ color: '#1A73E8' }} onClick={() => handleEdit(campus)} /></Tooltip>
                          <Popconfirm title="Xóa khu vực?" onConfirm={() => deleteMutation.mutate(campus.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                            <Tooltip title="Xóa"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip>
                          </Popconfirm>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      <Modal
        title={<span style={{ fontFamily: 'Google Sans, system-ui' }}>{editingId ? 'Chỉnh sửa Khu vực' : 'Thêm Khu vực mới'}</span>}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={handleModalClose}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editingId ? 'Cập nhật' : 'Thêm mới'}
        okButtonProps={{ style: { background: '#EA4335', border: 'none' } }}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={(v) => editingId ? updateMutation.mutate(v) : createMutation.mutate(v)} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tên khu vực" rules={[{ required: true }]}>
            <Input placeholder="VD: Cơ sở Gò Vấp" />
          </Form.Item>
          <Form.Item name="code" label="Mã khu vực" rules={[{ required: true }]}>
            <Input placeholder="VD: CS_GV" />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ" rules={[{ required: true }]}>
            <Input placeholder="VD: 123 Đường ABC, Quận Gò Vấp" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CampusListPage;
