import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Button, Modal, Form, Input, Card, Typography, message, Space, Select, Popconfirm, Tooltip, Spin, Tag } from 'antd';
import { PlusOutlined, BankOutlined, EnvironmentOutlined, DeleteOutlined, EyeOutlined, EditOutlined, TableOutlined, BuildOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSchools, createSchool, getAllCampuses, deleteSchool, updateSchool } from '../../../services/schoolService';
import { getDevices } from '../../../services/deviceService';
import { useAuthStore } from '../../../store/authStore';
import { SharedSceneLights } from '../../../components/3d/SharedScene';
import { SchoolBuilding3D } from '../../../components/3d/SchoolBuilding3D';

const { Title } = Typography;

const getGridLayout = (count: number, spacing: number): [number, number, number][] => {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const layout: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    layout.push([(col - (cols - 1) / 2) * spacing, 0, (row - (Math.ceil(count / cols) - 1) / 2) * spacing]);
  }
  return layout;
};

const SchoolListPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { user } = useAuthStore();
  const role = user?.role;

  const [isSchoolModalVisible, setIsSchoolModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'table'>('3d');

  const [schoolForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['schools', page, selectedCampusFilter],
    queryFn: () => getSchools({ page, size: 100, campusId: selectedCampusFilter || undefined }),
  });
  const schools = data?.content || [];

  const { data: devicesData } = useQuery({
    queryKey: ['devices', { size: 500 }],
    queryFn: () => getDevices({ page: 0, size: 500 }),
  });
  const allDevices = devicesData?.content || [];

  const getSchoolDeviceCount = (schoolId: string) =>
    allDevices.filter((d: any) => d.school?.id === schoolId).length;

  const { data: campusesData } = useQuery({
    queryKey: ['campuses'],
    queryFn: () => getAllCampuses(),
  });

  const createSchoolMutation = useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      message.success('Đã thêm trường học mới!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể tạo trường học');
    }
  });

  const updateSchoolMutation = useMutation({
    mutationFn: (values: any) => updateSchool(editingId as string, values),
    onSuccess: () => {
      message.success('Đã cập nhật trường học!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể cập nhật trường học');
    }
  });

  const deleteSchoolMutation = useMutation({
    mutationFn: deleteSchool,
    onSuccess: () => {
      message.success('Đã xóa trường học!');
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      if (selectedSchoolId) setSelectedSchoolId(null);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể xóa trường học');
    }
  });

  const handleModalClose = () => {
    setIsSchoolModalVisible(false);
    setEditingId(null);
    schoolForm.resetFields();
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    schoolForm.setFieldsValue({ name: record.name, code: record.code, campusId: record.campusId, address: record.address });
    setIsSchoolModalVisible(true);
    setSelectedSchoolId(null);
  };

  const displaySchools = selectedCampusFilter
    ? schools.filter((s: any) => s.campusId === selectedCampusFilter)
    : schools;

  const layout = getGridLayout(displaySchools.length, 16);
  const selectedSchool = displaySchools.find((s: any) => s.id === selectedSchoolId) as any;

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#050507' }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid rgba(0,180,120,0.12)',
        background: 'rgba(5,5,7,0.9)', backdropFilter: 'blur(16px)', flexShrink: 0,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(0,180,120,0.25), rgba(255,215,0,0.15))',
              border: '1px solid rgba(0,180,120,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BankOutlined style={{ color: '#00b878', fontSize: 15 }} />
            </div>
            <Title level={4} style={{ margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
              Quản lý Trường học
            </Title>
          </div>
          <p style={{ margin: '4px 0 0 42px', color: '#6b7280', fontSize: 12 }}>
            Mô hình 3D · {displaySchools.length} trường học
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Campus filter */}
          <Select
            allowClear
            placeholder="Tất cả khu vực"
            style={{ width: 180 }}
            value={selectedCampusFilter}
            onChange={(v) => { setSelectedCampusFilter(v); setSelectedSchoolId(null); }}
            options={campusesData?.map((c: any) => ({ value: c.id, label: c.name })) || []}
          />

          {/* View toggle */}
          <div style={{ display: 'flex', background: 'rgba(20,21,30,0.9)', border: '1px solid rgba(46,48,58,0.7)', borderRadius: 10, overflow: 'hidden' }}>
            {[{ key: '3d', icon: <BuildOutlined />, label: '3D' }, { key: 'table', icon: <TableOutlined />, label: 'Bảng' }].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key as any)}
                style={{
                  background: viewMode === key ? 'rgba(0,180,120,0.2)' : 'transparent',
                  color: viewMode === key ? '#00b878' : '#6b7280',
                  border: 'none', cursor: 'pointer', padding: '6px 14px',
                  fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all 0.2s',
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {role === 'SUPER_ADMIN' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsSchoolModalVisible(true)}
              style={{ background: 'linear-gradient(135deg,#00b878,#008855)', border: 'none', height: 38, borderRadius: 10, fontWeight: 600 }}
            >
              Thêm Trường
            </Button>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {viewMode === '3d' ? (
          <>
            {/* ── 3D Canvas ── */}
            <div style={{ flex: 1, position: 'relative' }}>
              {isLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,5,7,0.9)', zIndex: 20 }}>
                  <div style={{ textAlign: 'center' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 12, color: '#00b878', fontFamily: 'monospace', fontSize: 12 }}>Loading 3D Schools...</div>
                  </div>
                </div>
              )}

              <Canvas
                shadows
                camera={{ position: [0, 25, 35], fov: 42 }}
                style={{ background: 'transparent', width: '100%', height: '100%' }}
                gl={{ antialias: true, alpha: true }}
              >
                <color attach="background" args={['#0a0c08']} />
                <fog attach="fog" args={['#0a0c08', 50, 150]} />
                <SharedSceneLights primaryColor="#00b878" secondaryColor="#ffd700" />

                {/* Ground plane */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
                  <planeGeometry args={[200, 200]} />
                  <meshStandardMaterial color="#0a0f0a" roughness={0.95} />
                </mesh>
                <gridHelper args={[200, 80, '#0a2a1a', '#060e08']} position={[0, -0.08, 0]} />

                {/* School buildings */}
                {displaySchools.map((school: any, i: number) => (
                  <SchoolBuilding3D
                    key={school.id}
                    position={layout[i]}
                    name={school.name}
                    campusName={school.campusName}
                    deviceCount={getSchoolDeviceCount(school.id)}
                    classroomCount={0}
                    isSelected={selectedSchoolId === school.id}
                    onClick={() => setSelectedSchoolId(
                      selectedSchoolId === school.id ? null : school.id
                    )}
                  />
                ))}

                <OrbitControls
                  makeDefault
                  minDistance={6}
                  maxDistance={80}
                  maxPolarAngle={Math.PI / 2 - 0.05}
                  enableDamping
                  dampingFactor={0.06}
                />
              </Canvas>

              {/* HUD overlay */}
              <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
                {[
                  { color: '#00b878', label: 'Trường học', count: displaySchools.length },
                  { color: '#3b82f6', label: 'Thiết bị', count: allDevices.length },
                ].map(({ color, label, count }) => (
                  <div key={label} style={{
                    background: 'rgba(5,5,7,0.88)', border: `1px solid ${color}40`,
                    borderRadius: 10, padding: '8px 14px', backdropFilter: 'blur(12px)',
                  }}>
                    <div style={{ color, fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{count}</div>
                    <div style={{ color: '#6b7280', fontSize: 11 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Instructions */}
              <div style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(5,5,7,0.85)', border: '1px solid rgba(0,180,120,0.15)',
                borderRadius: 20, padding: '6px 16px', color: '#6b7280', fontSize: 11,
                backdropFilter: 'blur(12px)', fontFamily: 'monospace',
              }}>
                🖱️ Kéo để xoay · Cuộn để zoom · Click trường để chọn
              </div>
            </div>

            {/* ── Right panel ── */}
            <div style={{
              width: 320, background: 'rgba(10,10,15,0.95)', borderLeft: '1px solid rgba(46,48,58,0.7)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              {selectedSchool ? (
                <div style={{ padding: 20, borderBottom: '1px solid rgba(46,48,58,0.5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ color: '#00b878', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em' }}>
                      TRƯỜNG ĐÃ CHỌN
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Tooltip title="Xem Dashboard"><Button size="small" type="text" icon={<EyeOutlined />} style={{ color: '#ffd700' }} onClick={() => navigate(`/schools/${selectedSchool.id}/dashboard`)} /></Tooltip>
                      {role === 'SUPER_ADMIN' && (
                        <>
                          <Tooltip title="Sửa"><Button size="small" type="text" icon={<EditOutlined />} style={{ color: '#3b82f6' }} onClick={() => handleEdit(selectedSchool)} /></Tooltip>
                          <Popconfirm title="Xóa trường?" onConfirm={() => { deleteSchoolMutation.mutate(selectedSchool.id); setSelectedSchoolId(null); }} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                            <Tooltip title="Xóa"><Button size="small" type="text" icon={<DeleteOutlined />} danger /></Tooltip>
                          </Popconfirm>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{selectedSchool.name}</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <Tag style={{ background: 'rgba(0,180,120,0.15)', color: '#00b878', border: '1px solid rgba(0,180,120,0.3)', borderRadius: 6 }}>{selectedSchool.code}</Tag>
                    {selectedSchool.campusName && <Tag style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6 }}>{selectedSchool.campusName}</Tag>}
                  </div>
                  {selectedSchool.address && <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 10 }}>📍 {selectedSchool.address}</div>}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                      <div style={{ color: '#3b82f6', fontSize: 18, fontWeight: 700 }}>{getSchoolDeviceCount(selectedSchool.id)}</div>
                      <div style={{ color: '#6b7280', fontSize: 10 }}>Thiết bị</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 20, borderBottom: '1px solid rgba(46,48,58,0.5)', textAlign: 'center', color: '#4b5563' }}>
                  <BankOutlined style={{ fontSize: 28, marginBottom: 8, display: 'block', color: '#1a3a2a' }} />
                  <div style={{ fontSize: 12 }}>Click vào trường trên mô hình 3D để xem chi tiết</div>
                </div>
              )}

              {/* School list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                <div style={{ color: '#4b5563', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>
                  DANH SÁCH TRƯỜNG ({displaySchools.length})
                </div>
                {displaySchools.map((school: any) => {
                  const isActive = school.id === selectedSchoolId;
                  return (
                    <div
                      key={school.id}
                      onClick={() => setSelectedSchoolId(isActive ? null : school.id)}
                      style={{
                        padding: '10px 12px', borderRadius: 10, marginBottom: 6,
                        cursor: 'pointer', transition: 'all 0.2s',
                        background: isActive ? 'rgba(0,180,120,0.12)' : 'rgba(20,21,30,0.5)',
                        border: `1px solid ${isActive ? 'rgba(0,180,120,0.4)' : 'rgba(46,48,58,0.4)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00b878', boxShadow: isActive ? '0 0 8px #00b878' : 'none' }} />
                          <span style={{ color: isActive ? '#a0e8c8' : '#80c8a0', fontWeight: 600, fontSize: 13 }}>{school.name}</span>
                        </div>
                        <span style={{ color: '#4b5563', fontSize: 11, fontFamily: 'monospace' }}>{school.code}</span>
                      </div>
                      <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4, marginLeft: 16 }}>
                        📍 {school.campusName || 'N/A'} · 📱 {getSchoolDeviceCount(school.id)} thiết bị
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* ── Table view ── */
          <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            <Card style={{ background: '#16171d', border: '1px solid #2e303a', borderRadius: 12 }}>
              {isLoading ? <Spin /> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Tên Trường', 'Mã', 'Khu vực', 'Địa chỉ', 'Thiết bị', 'Hành động'].map(h => (
                        <th key={h} style={{ color: '#6b7280', fontSize: 12, fontWeight: 600, textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #2e303a' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displaySchools.map((school: any) => (
                      <tr key={school.id} style={{ borderBottom: '1px solid rgba(46,48,58,0.4)' }}>
                        <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 500 }}>
                          <Space><BankOutlined style={{ color: '#00b878' }} />{school.name}</Space>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#6b7280', fontFamily: 'monospace' }}>{school.code}</td>
                        <td style={{ padding: '10px 12px', color: '#9ca3af' }}>{school.campusName || 'N/A'}</td>
                        <td style={{ padding: '10px 12px', color: '#9ca3af' }}>{school.address}</td>
                        <td style={{ padding: '10px 12px', color: '#3b82f6', fontWeight: 700 }}>{getSchoolDeviceCount(school.id)}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <Space>
                            <Tooltip title="Xem Dashboard"><Button type="text" icon={<EyeOutlined />} style={{ color: '#ffd700' }} onClick={() => navigate(`/schools/${school.id}/dashboard`)} /></Tooltip>
                            {role === 'SUPER_ADMIN' && (
                              <>
                                <Tooltip title="Sửa"><Button type="text" icon={<EditOutlined />} style={{ color: '#3b82f6' }} onClick={() => handleEdit(school)} /></Tooltip>
                                <Popconfirm title="Xóa trường?" onConfirm={() => deleteSchoolMutation.mutate(school.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                                  <Tooltip title="Xóa"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip>
                                </Popconfirm>
                              </>
                            )}
                          </Space>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* ── CRUD Modal ── */}
      <Modal
        title={editingId ? 'Cập nhật Trường học' : 'Thêm Trường học mới'}
        open={isSchoolModalVisible}
        onOk={() => schoolForm.submit()}
        onCancel={handleModalClose}
        confirmLoading={createSchoolMutation.isPending || updateSchoolMutation.isPending}
        className="dark-modal"
        okText={editingId ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
      >
        <Form form={schoolForm} layout="vertical" onFinish={(values) => {
          if (editingId) updateSchoolMutation.mutate(values);
          else createSchoolMutation.mutate(values);
        }} style={{ marginTop: 16 }}>
          <Form.Item name="campusId" label="Khu vực (Campus)" rules={[{ required: true, message: 'Vui lòng chọn khu vực' }]}>
            <Select
              showSearch
              placeholder="Chọn khu vực"
              optionFilterProp="label"
              options={campusesData?.map((c: any) => ({ value: c.id, label: c.name })) || []}
            />
          </Form.Item>
          <Form.Item name="name" label="Tên trường" rules={[{ required: true }]}>
            <Input placeholder="VD: THCS Phan Văn Trị" />
          </Form.Item>
          <Form.Item name="code" label="Mã trường" rules={[{ required: true }]}>
            <Input placeholder="VD: PVT" />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ" rules={[{ required: true }]}>
            <Input placeholder="VD: 123 Đường ABC, Quận XYZ" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SchoolListPage;
