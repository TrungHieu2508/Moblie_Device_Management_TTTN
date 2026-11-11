import { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  Button,
  Modal,
  Form,
  Input,
  Card,
  Typography,
  message,
  Space,
  Popconfirm,
  Select,
  Spin,
  Tooltip,
  Table,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  TableOutlined,
  VideoCameraOutlined,
  DesktopOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSchools,
  getClassrooms,
  getAllClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  getAllCampuses,
} from '../../../services/schoolService';
import { getDevices } from '../../../services/deviceService';
import { useAuthStore } from '../../../store/authStore';
import { SharedSceneLights } from '../../../components/3d/SharedScene';
import { ClassroomScene3D } from '../../../components/3d/ClassroomScene3D';

const { Title } = Typography;

const ClassroomListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const role = user?.role;

  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(
    () => localStorage.getItem('lastSelectedCampusId') || null
  );
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(() => {
    if (role !== 'SUPER_ADMIN') return user?.schoolId || null;
    return localStorage.getItem('lastSelectedSchoolId') || null;
  });
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | '3d'>('table');
  const [searchText, setSearchText] = useState('');
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

  const { data: campusesData } = useQuery({
    queryKey: ['campuses'],
    queryFn: () => getAllCampuses(),
    enabled: role === 'SUPER_ADMIN',
  });

  const { data: schoolsData, isLoading: isLoadingSchools } = useQuery({
    queryKey: ['schools', { size: 200, campusId: selectedCampusId }],
    queryFn: () => getSchools({ page: 0, size: 200, campusId: selectedCampusId || undefined }),
  });
  const schools = (Array.isArray(schoolsData) ? schoolsData : schoolsData?.content) || [];

  const { data: classroomsBySchool = [], isLoading: isLoadingBySchool } = useQuery({
    queryKey: ['classrooms', selectedSchoolId],
    queryFn: () => getClassrooms(selectedSchoolId as string),
    enabled: !!selectedSchoolId,
  });

  const { data: allClassroomsData = [], isLoading: isLoadingAllClassrooms } = useQuery({
    queryKey: ['classrooms_all'],
    queryFn: () => getAllClassrooms(),
    enabled: !selectedSchoolId,
  });

  const rawClassrooms = useMemo(() => {
    if (selectedSchoolId) return (Array.isArray(classroomsBySchool) ? classroomsBySchool : []) as any[];
    const list = (Array.isArray(allClassroomsData) ? allClassroomsData : (allClassroomsData as any)?.content) || [];
    if (selectedCampusId) {
      const campusSchoolIds = new Set(schools.map((s: any) => s.id));
      return list.filter((c: any) => campusSchoolIds.has(c.schoolId));
    }
    return list;
  }, [selectedSchoolId, classroomsBySchool, allClassroomsData, selectedCampusId, schools]);

  const classrooms = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rawClassrooms;
    return rawClassrooms.filter(
      (c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.schoolName?.toLowerCase().includes(q) ||
        c.campusName?.toLowerCase().includes(q)
    );
  }, [rawClassrooms, searchText]);

  const { data: devicesData, isLoading: isLoadingDevices } = useQuery({
    queryKey: ['devices_classroom', selectedSchoolId],
    queryFn: () => getDevices({ page: 0, size: 500, schoolId: selectedSchoolId || undefined }),
    refetchInterval: 15000,
  });
  const allDevices = (Array.isArray(devicesData) ? devicesData : devicesData?.content) || [];

  const selectedClassroomDevices = selectedClassroomId
    ? allDevices.filter((d: any) => d.classroom?.id === selectedClassroomId)
    : [];

  const selectedClassroom = rawClassrooms.find((c: any) => c.id === selectedClassroomId);

  const getClassroomStats = (classroomId: string) => {
    const devices = allDevices.filter((d: any) => d.classroom?.id === classroomId);
    return {
      total: devices.length,
      online: devices.filter((d: any) => d.status === 'ONLINE').length,
      offline: devices.filter((d: any) => d.status === 'OFFLINE').length,
    };
  };

  const mutationCreate = useMutation({
    mutationFn: (data: { name: string; code: string; schoolId: string }) => createClassroom(data.schoolId, data),
    onSuccess: () => {
      message.success('Đã thêm lớp học mới!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      queryClient.invalidateQueries({ queryKey: ['classrooms_all'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || error.response?.data?.detail || 'Không thể tạo lớp học');
    },
  });

  const mutationUpdate = useMutation({
    mutationFn: (data: { id: string; name: string; code: string }) =>
      updateClassroom(data.id, { name: data.name, code: data.code }),
    onSuccess: () => {
      message.success('Đã cập nhật lớp học!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      queryClient.invalidateQueries({ queryKey: ['classrooms_all'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || error.response?.data?.detail || 'Không thể cập nhật lớp học');
    },
  });

  const mutationDelete = useMutation({
    mutationFn: deleteClassroom,
    onSuccess: () => {
      message.success('Đã xóa lớp học!');
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      queryClient.invalidateQueries({ queryKey: ['classrooms_all'] });
      if (selectedClassroomId) setSelectedClassroomId(null);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || error.response?.data?.detail || 'Không thể xóa lớp học');
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

  const isLoading = isLoadingBySchool || isLoadingAllClassrooms || isLoadingDevices;
  const totalOnline = allDevices.filter((d: any) => d.status === 'ONLINE').length;
  const totalOffline = allDevices.filter((d: any) => d.status === 'OFFLINE').length;

  const columns = [
    {
      title: 'Tên Lớp Học',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <BookOutlined className="text-emerald-400" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">{name}</div>
            <div className="text-xs text-gray-500 font-mono-data">{record.code}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Trường học',
      dataIndex: 'schoolName',
      key: 'schoolName',
      render: (schoolName: string, record: any) => {
        const resolvedSchool = schoolName || schools.find((s: any) => s.id === record.schoolId)?.name || 'N/A';
        return <span className="text-gray-300 font-medium">{resolvedSchool}</span>;
      },
    },
    {
      title: 'Khu vực (Campus)',
      dataIndex: 'campusName',
      key: 'campusName',
      render: (campusName: string, record: any) => {
        const resolvedCampus = campusName || schools.find((s: any) => s.id === record.schoolId)?.campusName || 'N/A';
        return <Tag className="border-0 bg-blue-500/15 text-blue-300 px-2.5 py-0.5 rounded-md">{resolvedCampus}</Tag>;
      },
    },
    {
      title: 'Thiết bị Học sinh',
      key: 'devices',
      width: 180,
      render: (_: any, record: any) => {
        const stats = getClassroomStats(record.id);
        return (
          <div className="flex items-center gap-2">
            <Tag className="border-0 bg-green-500/15 text-green-400 font-semibold px-2.5 py-0.5 rounded-full m-0">
              🟢 {stats.online} Online
            </Tag>
            <span className="text-xs text-gray-400 font-mono-data">/ {stats.total} máy</span>
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 340,
      render: (_: any, record: any) => (
        <Space size="small" wrap>
          <Button
            size="small"
            icon={<VideoCameraOutlined />}
            onClick={() => {
              if (record.schoolId) localStorage.setItem('lastSelectedSchoolId', record.schoolId);
              navigate('/teacher');
            }}
            style={{
              background: 'rgba(0,212,255,0.12)',
              borderColor: 'rgba(0,212,255,0.35)',
              color: '#00d4ff',
              borderRadius: 8,
            }}
          >
            Giám sát Lớp
          </Button>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedClassroomId(record.id);
              setViewMode('3d');
            }}
            style={{
              background: 'rgba(16,185,129,0.12)',
              borderColor: 'rgba(16,185,129,0.35)',
              color: '#34d399',
              borderRadius: 8,
            }}
          >
            Phòng 3D
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{
              background: 'rgba(59,130,246,0.12)',
              borderColor: 'rgba(59,130,246,0.35)',
              color: '#60a5fa',
              borderRadius: 8,
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa lớp học này?"
            onConfirm={() => mutationDelete.mutate(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#050507' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid rgba(46,48,58,0.65)',
          background: 'rgba(8,9,15,0.92)',
          backdropFilter: 'blur(16px)',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'linear-gradient(135deg,rgba(16,185,129,0.2),rgba(0,212,255,0.1))',
                border: '1px solid rgba(16,185,129,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookOutlined style={{ color: '#10b981', fontSize: 16 }} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
                Quản lý Lớp học
              </Title>
              <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                <span style={{ color: '#9ca3af', fontSize: 12 }}>Tổng {classrooms.length} lớp học</span>
                <span style={{ color: '#22c55e', fontSize: 12 }}>🟢 {totalOnline} máy online</span>
                <span style={{ color: '#6b7280', fontSize: 12 }}>⚫ {totalOffline} máy offline</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div
            style={{
              display: 'flex',
              background: '#16171d',
              border: '1px solid #2e303a',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            {[
              { key: 'table', icon: <TableOutlined />, label: 'Danh sách Bảng' },
              { key: '3d', icon: <VideoCameraOutlined />, label: 'Phòng học 3D' },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key as any)}
                style={{
                  background: viewMode === key ? 'rgba(16,185,129,0.2)' : 'transparent',
                  color: viewMode === key ? '#34d399' : '#9ca3af',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '7px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
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
            onClick={() => {
              setEditingId(null);
              form.resetFields();
              if (selectedSchoolId) form.setFieldsValue({ schoolId: selectedSchoolId });
              else if (user?.schoolId) form.setFieldsValue({ schoolId: user.schoolId });
              setIsModalVisible(true);
            }}
            style={{
              background: 'linear-gradient(135deg,#10b981,#059669)',
              border: 'none',
              height: 38,
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            Thêm Lớp học
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {viewMode === 'table' ? (
          <div className="flex-1 p-6 overflow-y-auto">
            <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg">
              <div className="flex flex-wrap items-center gap-4 mb-5">
                <Input
                  placeholder="Tìm kiếm tên lớp, mã lớp, trường học..."
                  prefix={<SearchOutlined className="text-gray-500" />}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  allowClear
                  className="max-w-sm bg-[#1f2028] border-[#2e303a] text-white"
                />
                {role === 'SUPER_ADMIN' && (
                  <Select
                    allowClear
                    placeholder="Lọc theo Khu vực (Campus)"
                    style={{ width: 220 }}
                    value={selectedCampusId}
                    onChange={val => {
                      setSelectedCampusId(val || null);
                      setSelectedSchoolId(null);
                      setSelectedClassroomId(null);
                    }}
                    options={campusesData?.map((c: any) => ({ value: c.id, label: c.name })) || []}
                  />
                )}
                {role !== 'TEACHER' && (
                  <Select
                    allowClear
                    placeholder="Lọc theo Trường học (Tất cả)"
                    style={{ width: 240 }}
                    value={selectedSchoolId}
                    onChange={val => {
                      setSelectedSchoolId(val || null);
                      setSelectedClassroomId(null);
                    }}
                    options={schools.map((s: any) => ({ value: s.id, label: s.name }))}
                    loading={isLoadingSchools}
                  />
                )}
              </div>

              <Table
                columns={columns}
                dataSource={classrooms}
                loading={isLoading}
                rowKey="id"
                pagination={{ pageSize: 10, className: 'custom-pagination' }}
                className="custom-dark-table"
              />
            </Card>
          </div>
        ) : (
          <>
            {/* Left classroom selector in 3D view */}
            <div
              style={{
                width: 270,
                background: 'rgba(8,10,18,0.97)',
                borderRight: '1px solid rgba(46,48,58,0.7)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <div style={{ padding: '12px', borderBottom: '1px solid rgba(46,48,58,0.5)' }}>
                <div style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                  CHỌN LỚP HỌC ({classrooms.length})
                </div>
                {role !== 'TEACHER' && (
                  <Select
                    allowClear
                    placeholder="Tất cả trường học"
                    style={{ width: '100%' }}
                    size="small"
                    value={selectedSchoolId}
                    onChange={val => {
                      setSelectedSchoolId(val || null);
                      setSelectedClassroomId(null);
                    }}
                    options={schools.map((s: any) => ({ value: s.id, label: s.name }))}
                  />
                )}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                {classrooms.map((classroom: any) => {
                  const isActive = classroom.id === selectedClassroomId;
                  const stats = getClassroomStats(classroom.id);
                  return (
                    <div
                      key={classroom.id}
                      onClick={() => setSelectedClassroomId(isActive ? null : classroom.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        marginBottom: 5,
                        cursor: 'pointer',
                        background: isActive ? 'rgba(16,185,129,0.14)' : 'rgba(20,21,30,0.6)',
                        border: `1px solid ${isActive ? 'rgba(16,185,129,0.5)' : 'rgba(46,48,58,0.5)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: isActive ? '#6ee7b7' : '#e5e7eb', fontWeight: 600, fontSize: 13 }}>
                          {classroom.name}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Tooltip title="Sửa">
                            <Button
                              size="small"
                              type="text"
                              icon={<EditOutlined />}
                              style={{ color: '#60a5fa', width: 22, height: 22, minWidth: 22 }}
                              onClick={e => {
                                e.stopPropagation();
                                handleEdit(classroom);
                              }}
                            />
                          </Tooltip>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        🟢 {stats.online} online / {stats.total} máy
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 3D Canvas */}
            <div style={{ flex: 1, position: 'relative' }}>
              {!selectedClassroomId && !isLoading && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%,-50%)',
                    textAlign: 'center',
                    zIndex: 10,
                    pointerEvents: 'none',
                  }}
                >
                  <BookOutlined style={{ fontSize: 48, color: '#10b981', marginBottom: 12 }} />
                  <div style={{ color: '#9ca3af', fontSize: 14 }}>Chọn một lớp học từ danh sách bên trái để xem phòng học 3D</div>
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

                <SharedSceneLights primaryColor="#10b981" secondaryColor="#00d4ff" />
                <pointLight position={[0, 8, 0]} intensity={1.5} color="#e0f0ff" />
                <ambientLight intensity={0.4} color="#e0f0ff" />

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

              {selectedClassroomId && (
                <div style={{ position: 'absolute', top: 16, right: 16 }}>
                  <div
                    style={{
                      background: 'rgba(5,5,7,0.9)',
                      border: '1px solid rgba(16,185,129,0.25)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      minWidth: 180,
                    }}
                  >
                    <div style={{ color: '#34d399', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                      LỚP {selectedClassroom?.name?.toUpperCase()}
                    </div>
                    {[
                      { icon: <DesktopOutlined />, label: 'Tổng thiết bị', val: selectedClassroomDevices.length, color: '#9ca3af' },
                      {
                        icon: <ThunderboltOutlined />,
                        label: 'Đang online',
                        val: selectedClassroomDevices.filter((d: any) => d.status === 'ONLINE').length,
                        color: '#22c55e',
                      },
                    ].map(({ icon, label, val, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>
                          {icon} {label}
                        </span>
                        <span style={{ color, fontWeight: 700 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* CRUD Modal */}
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
          onFinish={values => {
            const schoolIdToUse = values.schoolId || selectedSchoolId || user?.schoolId;
            if (editingId) mutationUpdate.mutate({ id: editingId, ...values });
            else mutationCreate.mutate({ ...values, schoolId: schoolIdToUse });
          }}
        >
          {role !== 'TEACHER' && (
            <Form.Item name="schoolId" label="Trường học" rules={[{ required: true, message: 'Vui lòng chọn trường học' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Chọn trường học"
                options={schools.map((s: any) => ({ value: s.id, label: s.name }))}
                disabled={editingId !== null}
              />
            </Form.Item>
          )}
          <Form.Item name="name" label="Tên Lớp Học" rules={[{ required: true, message: 'Vui lòng nhập tên lớp học' }]}>
            <Input placeholder="Ví dụ: 10A1" />
          </Form.Item>
          <Form.Item name="code" label="Mã Lớp Học" rules={[{ required: true, message: 'Vui lòng nhập mã lớp học' }]}>
            <Input placeholder="Ví dụ: 10A1_2026" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            style={{ width: '100%', background: '#10b981', border: 'none', height: 38 }}
            loading={mutationCreate.isPending || mutationUpdate.isPending}
          >
            {editingId ? 'Cập nhật Lớp học' : 'Thêm Lớp Học'}
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default ClassroomListPage;
