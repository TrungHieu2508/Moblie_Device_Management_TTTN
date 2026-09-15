import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Button, Modal, Form, Input, Card, Typography, message, Space, Popconfirm, Select, Spin, Badge, Tooltip } from 'antd';
import {
  PlusOutlined, BookOutlined, DeleteOutlined, EditOutlined,
  TableOutlined, VideoCameraOutlined, DesktopOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSchools, getClassrooms, createClassroom, updateClassroom, deleteClassroom, getAllCampuses,
} from '../../../services/schoolService';
import { getDevices } from '../../../services/deviceService';
import { useAuthStore } from '../../../store/authStore';
import { SharedSceneLights } from '../../../components/3d/SharedScene';
import { ClassroomScene3D } from '../../../components/3d/ClassroomScene3D';

const { Title } = Typography;

const ClassroomListPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const role = user?.role;

  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(
    () => localStorage.getItem('lastSelectedCampusId')
  );
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(() => {
    if (role !== 'SUPER_ADMIN') return user?.schoolId || null;
    return localStorage.getItem('lastSelectedSchoolId');
  });
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'table'>('3d');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (selectedCampusId) localStorage.setItem('lastSelectedCampusId', selectedCampusId);
    else localStorage.removeItem('lastSelectedCampusId');
  }, [selectedCampusId]);
  useEffect(() => {
    if (selectedSchoolId) localStorage.setItem('lastSelectedSchoolId', selectedSchoolId);
    else localStorage.removeItem('lastSelectedSchoolId');
  }, [selectedSchoolId]);

  // ── Data queries ──────────────────────────────────────────────────
  const { data: campusesData } = useQuery({
    queryKey: ['campuses'],
    queryFn: () => getAllCampuses(),
    enabled: role === 'SUPER_ADMIN',
  });

  const { data: schoolsData, isLoading: isLoadingSchools } = useQuery({
    queryKey: ['schools', { size: 100, campusId: selectedCampusId }],
    queryFn: () => getSchools({ page: 0, size: 100, campusId: selectedCampusId || undefined }),
    enabled: role !== 'TEACHER',
  });
  const schools = schoolsData?.content || [];

  useEffect(() => {
    if (role === 'SUPER_ADMIN' && !selectedSchoolId && schools.length > 0) {
      const saved = localStorage.getItem('lastSelectedSchoolId');
      const exists = saved && schools.some((s: any) => s.id === saved);
      if (!exists) setSelectedSchoolId(schools[0].id);
    }
  }, [schools, role, selectedSchoolId]);

  const { data: classrooms = [], isLoading: isLoadingClassrooms } = useQuery({
    queryKey: ['classrooms', selectedSchoolId],
    queryFn: () => getClassrooms(selectedSchoolId as string),
    enabled: !!selectedSchoolId,
  });

  // Devices with classroomId filter (real-time refresh)
  const { data: devicesData, isLoading: isLoadingDevices } = useQuery({
    queryKey: ['devices_classroom', selectedSchoolId],
    queryFn: () => getDevices({ page: 0, size: 500, schoolId: selectedSchoolId || undefined }),
    enabled: !!selectedSchoolId,
    refetchInterval: 15000, // update every 15 seconds
  });
  const allDevices = devicesData?.content || [];

  // Devices for the selected classroom
  const selectedClassroomDevices = selectedClassroomId
    ? allDevices.filter((d: any) => d.classroom?.id === selectedClassroomId)
    : [];

  const selectedClassroom = (classrooms as any[]).find((c: any) => c.id === selectedClassroomId);

  // ── Device stats per classroom ────────────────────────────────────
  const getClassroomStats = (classroomId: string) => {
    const devices = allDevices.filter((d: any) => d.classroom?.id === classroomId);
    return {
      total: devices.length,
      online: devices.filter((d: any) => d.status === 'ONLINE').length,
      offline: devices.filter((d: any) => d.status === 'OFFLINE').length,
    };
  };

  // ── Mutations ─────────────────────────────────────────────────────
  const mutationCreate = useMutation({
    mutationFn: (data: { name: string; code: string; schoolId: string }) =>
      createClassroom(data.schoolId, data),
    onSuccess: () => {
      message.success('Đã thêm lớp học mới!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['classrooms', selectedSchoolId] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể tạo lớp học');
    },
  });

  const mutationUpdate = useMutation({
    mutationFn: (data: { id: string; name: string; code: string }) =>
      updateClassroom(data.id, { name: data.name, code: data.code }),
    onSuccess: () => {
      message.success('Đã cập nhật lớp học!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['classrooms', selectedSchoolId] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể cập nhật lớp học');
    },
  });

  const mutationDelete = useMutation({
    mutationFn: deleteClassroom,
    onSuccess: () => {
      message.success('Đã xóa lớp học!');
      queryClient.invalidateQueries({ queryKey: ['classrooms', selectedSchoolId] });
      if (selectedClassroomId) setSelectedClassroomId(null);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể xóa lớp học');
    },
  });

  const handleModalClose = () => {
    setIsModalVisible(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({ name: record.name, code: record.code, schoolId: record.schoolId });
    setIsModalVisible(true);
  };

  const isLoading = isLoadingClassrooms || isLoadingDevices;

  // Online device count for the whole school
  const totalOnline = allDevices.filter((d: any) => d.status === 'ONLINE').length;
  const totalOffline = allDevices.filter((d: any) => d.status === 'OFFLINE').length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#050507' }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 24px', borderBottom: '1px solid rgba(16,185,129,0.12)',
        background: 'rgba(5,5,7,0.9)', backdropFilter: 'blur(16px)', flexShrink: 0, flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg,rgba(16,185,129,0.2),rgba(0,212,255,0.1))',
              border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BookOutlined style={{ color: '#10b981', fontSize: 15 }} />
            </div>
            <Title level={4} style={{ margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
              Quản Lý Lớp Học 3D
            </Title>
          </div>
          <div style={{ display: 'flex', gap: 12, margin: '4px 0 0 42px' }}>
            <span style={{ color: '#22c55e', fontSize: 12 }}>🟢 {totalOnline} online</span>
            <span style={{ color: '#6b7280', fontSize: 12 }}>⚫ {totalOffline} offline</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Campus filter (SUPER_ADMIN only) */}
          {role === 'SUPER_ADMIN' && (
            <Select
              allowClear
              placeholder="Khu vực"
              style={{ width: 160 }}
              value={selectedCampusId}
              onChange={(val) => { setSelectedCampusId(val); setSelectedSchoolId(null); setSelectedClassroomId(null); }}
              options={campusesData?.map((c: any) => ({ value: c.id, label: c.name })) || []}
            />
          )}

          {/* School filter */}
          {role !== 'TEACHER' && (
            <Select
              placeholder="Chọn trường học"
              style={{ width: 220 }}
              value={selectedSchoolId}
              onChange={(val) => { setSelectedSchoolId(val); setSelectedClassroomId(null); }}
              options={schools.map((s: any) => ({ value: s.id, label: s.name }))}
              loading={isLoadingSchools}
            />
          )}

          {/* View toggle */}
          <div style={{ display: 'flex', background: 'rgba(20,21,30,0.9)', border: '1px solid rgba(46,48,58,0.7)', borderRadius: 10, overflow: 'hidden' }}>
            {[
              { key: '3d', icon: <VideoCameraOutlined />, label: '3D' },
              { key: 'table', icon: <TableOutlined />, label: 'Bảng' },
            ].map(({ key, icon, label }) => (
              <button key={key} onClick={() => setViewMode(key as any)} style={{
                background: viewMode === key ? 'rgba(16,185,129,0.2)' : 'transparent',
                color: viewMode === key ? '#10b981' : '#6b7280',
                border: 'none', cursor: 'pointer', padding: '6px 14px',
                fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s',
              }}>
                {icon} {label}
              </button>
            ))}
          </div>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { if (selectedSchoolId) form.setFieldsValue({ schoolId: selectedSchoolId }); setIsModalVisible(true); }}
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', height: 38, borderRadius: 10, fontWeight: 600 }}
          >
            Thêm Lớp
          </Button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left: Classroom list panel ── */}
        <div style={{
          width: 260, background: 'rgba(8,10,18,0.97)', borderRight: '1px solid rgba(46,48,58,0.7)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
        }}>
          <div style={{ padding: '12px', borderBottom: '1px solid rgba(46,48,58,0.5)' }}>
            <div style={{ color: '#4b5563', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
              DANH SÁCH LỚP ({(classrooms as any[]).length})
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {!selectedSchoolId ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#4b5563', fontSize: 12 }}>
                Chọn trường học để hiển thị lớp
              </div>
            ) : isLoadingClassrooms ? (
              <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}><Spin /></div>
            ) : (classrooms as any[]).length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#4b5563', fontSize: 12 }}>
                Chưa có lớp học nào
              </div>
            ) : (
              (classrooms as any[]).map((classroom: any) => {
                const isActive = classroom.id === selectedClassroomId;
                const stats = getClassroomStats(classroom.id);
                return (
                  <div
                    key={classroom.id}
                    onClick={() => setSelectedClassroomId(isActive ? null : classroom.id)}
                    style={{
                      padding: '10px 12px', borderRadius: 10, marginBottom: 5, cursor: 'pointer', transition: 'all 0.2s',
                      background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(20,21,30,0.5)',
                      border: `1px solid ${isActive ? 'rgba(16,185,129,0.45)' : 'rgba(46,48,58,0.4)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: '#10b981', boxShadow: isActive ? '0 0 6px #10b981' : 'none' }} />
                        <span style={{ color: isActive ? '#6ee7b7' : '#9ca3af', fontWeight: 600, fontSize: 13 }}>{classroom.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Tooltip title="Sửa">
                          <Button size="small" type="text" icon={<EditOutlined />} style={{ color: '#6b7280', width: 22, height: 22, minWidth: 22 }}
                            onClick={(e) => { e.stopPropagation(); handleEdit(classroom); }} />
                        </Tooltip>
                        <Popconfirm title="Xóa lớp học?" onConfirm={(e) => { e?.stopPropagation(); mutationDelete.mutate(classroom.id); }} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                          <Tooltip title="Xóa">
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} style={{ width: 22, height: 22, minWidth: 22 }}
                              onClick={(e) => e.stopPropagation()} />
                          </Tooltip>
                        </Popconfirm>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 5, marginLeft: 15 }}>
                      {stats.online > 0 && (
                        <span style={{ fontSize: 10, color: '#22c55e', fontFamily: 'monospace' }}>
                          🟢 {stats.online}
                        </span>
                      )}
                      {stats.offline > 0 && (
                        <span style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>
                          ⚫ {stats.offline}
                        </span>
                      )}
                      {stats.total === 0 && (
                        <span style={{ fontSize: 10, color: '#374151', fontFamily: 'monospace' }}>Không có thiết bị</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: 3D Canvas or Table ── */}
        {viewMode === '3d' ? (
          <div style={{ flex: 1, position: 'relative' }}>
            {/* Loading overlay */}
            {isLoading && selectedSchoolId && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,5,7,0.9)', zIndex: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 12, color: '#10b981', fontFamily: 'monospace', fontSize: 12 }}>Loading 3D Classroom...</div>
                </div>
              </div>
            )}

            {/* Prompt when no classroom selected */}
            {!selectedClassroomId && !isLoading && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                textAlign: 'center', zIndex: 10, pointerEvents: 'none',
              }}>
                <BookOutlined style={{ fontSize: 48, color: '#1a3a2a', marginBottom: 12 }} />
                <div style={{ color: '#374151', fontSize: 14 }}>Chọn một lớp học từ danh sách để xem cảnh 3D</div>
              </div>
            )}

            <Canvas
              shadows
              camera={{ position: [0, 10, 14], fov: 52 }}
              style={{ background: 'transparent', width: '100%', height: '100%' }}
              gl={{ antialias: true, alpha: true }}
            >
              <color attach="background" args={['#020408']} />
              <fog attach="fog" args={['#020408', 20, 60]} />

              {/* Lights */}
              <SharedSceneLights primaryColor="#10b981" secondaryColor="#00d4ff" />
              <pointLight position={[0, 8, 0]} intensity={1.5} color="#e0f0ff" />
              <ambientLight intensity={0.4} color="#e0f0ff" />

              {/* Classroom scene */}
              {selectedClassroomId && (
                <ClassroomScene3D
                  classroomName={selectedClassroom?.name || ''}
                  devices={selectedClassroomDevices}
                />
              )}

              <OrbitControls
                makeDefault
                minDistance={3}
                maxDistance={30}
                maxPolarAngle={Math.PI / 2 - 0.02}
                enableDamping
                dampingFactor={0.07}
              />
            </Canvas>

            {/* ── Device stats HUD ── */}
            {selectedClassroomId && (
              <div style={{
                position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{
                  background: 'rgba(5,5,7,0.9)', border: '1px solid rgba(16,185,129,0.25)',
                  borderRadius: 12, padding: '12px 16px', backdropFilter: 'blur(12px)',
                  minWidth: 180,
                }}>
                  <div style={{ color: '#4b5563', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>
                    {selectedClassroom?.name?.toUpperCase() || 'LỚP HỌC'}
                  </div>
                  {[
                    { icon: <DesktopOutlined />, label: 'Tổng thiết bị', val: selectedClassroomDevices.length, color: '#9ca3af' },
                    { icon: <ThunderboltOutlined />, label: 'Đang online', val: selectedClassroomDevices.filter((d: any) => d.status === 'ONLINE').length, color: '#22c55e' },
                    { icon: <DesktopOutlined />, label: 'Offline', val: selectedClassroomDevices.filter((d: any) => d.status === 'OFFLINE').length, color: '#ef4444' },
                  ].map(({ icon, label, val, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ color: '#6b7280', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ color }}>{icon}</span> {label}
                      </div>
                      <span style={{ color, fontWeight: 700, fontSize: 14, fontFamily: 'monospace' }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Live indicator */}
                <div style={{
                  background: 'rgba(5,5,7,0.85)', border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: 8, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', animation: 'pulse 2s infinite' }} />
                  <span style={{ color: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}>Auto-refresh 15s</span>
                </div>
              </div>
            )}

            <div style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(5,5,7,0.85)', border: '1px solid rgba(16,185,129,0.15)',
              borderRadius: 20, padding: '6px 16px', color: '#6b7280', fontSize: 11,
              backdropFilter: 'blur(12px)', fontFamily: 'monospace',
            }}>
              📚 Kéo để xoay · Cuộn để zoom · Hover thiết bị để xem thông tin
            </div>
          </div>
        ) : (
          /* ── Table fallback ── */
          <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
            <Card style={{ background: '#16171d', border: '1px solid #2e303a', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Tên Lớp Học', 'Mã Lớp', 'Trường học', 'Khu vực', 'Thiết bị', 'Thao tác'].map(h => (
                      <th key={h} style={{ color: '#6b7280', fontSize: 12, fontWeight: 600, textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #2e303a' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(classrooms as any[]).map((classroom: any) => {
                    const stats = getClassroomStats(classroom.id);
                    return (
                      <tr key={classroom.id} style={{ borderBottom: '1px solid rgba(46,48,58,0.4)' }}>
                        <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 500 }}>
                          <Space><BookOutlined style={{ color: '#10b981' }} />{classroom.name}</Space>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#6b7280', fontFamily: 'monospace' }}>{classroom.code}</td>
                        <td style={{ padding: '10px 12px', color: '#9ca3af' }}>{classroom.schoolName || 'N/A'}</td>
                        <td style={{ padding: '10px 12px', color: '#6b7280' }}>{classroom.campusName || 'N/A'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <Space>
                            <Badge count={stats.online} color="#22c55e" />
                            <span style={{ color: '#6b7280', fontSize: 11 }}>/{stats.total}</span>
                          </Space>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <Space>
                            <Tooltip title="Sửa"><Button type="text" icon={<EditOutlined />} style={{ color: '#00d4ff' }} onClick={() => handleEdit(classroom)} /></Tooltip>
                            <Popconfirm title="Xóa lớp học?" onConfirm={() => mutationDelete.mutate(classroom.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                              <Tooltip title="Xóa"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip>
                            </Popconfirm>
                          </Space>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </div>

      {/* ── CRUD Modal ── */}
      <Modal
        title={editingId ? 'Cập Nhật Lớp Học' : 'Thêm Lớp Học Mới'}
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={null}
        className="dark-modal"
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
          onFinish={(values) => {
            if (editingId) mutationUpdate.mutate({ id: editingId, ...values });
            else mutationCreate.mutate(values);
          }}
        >
          {role !== 'TEACHER' && (
            <Form.Item name="schoolId" label="Trường học" rules={[{ required: true, message: 'Vui lòng chọn trường học' }]}>
              <Select
                placeholder="Chọn trường học"
                options={schools.map((s: any) => ({ value: s.id, label: s.name }))}
                disabled={editingId !== null}
              />
            </Form.Item>
          )}
          <Form.Item name="name" label="Tên Lớp Học" rules={[{ required: true }]}>
            <Input placeholder="Ví dụ: 10A1" />
          </Form.Item>
          <Form.Item name="code" label="Mã Lớp Học" rules={[{ required: true }]}>
            <Input placeholder="Ví dụ: 10A1_2023" />
          </Form.Item>
          <Button type="primary" htmlType="submit" style={{ width: '100%' }} loading={mutationCreate.isPending || mutationUpdate.isPending}>
            {editingId ? 'Cập nhật Lớp học' : 'Thêm Lớp Học'}
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default ClassroomListPage;
