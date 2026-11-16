import { useState, useMemo, useEffect } from 'react';
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
  Select,
  Popconfirm,
  Tooltip,
  Spin,
  Tag,
  Table,
} from 'antd';
import {
  PlusOutlined,
  BankOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  TableOutlined,
  BuildOutlined,
  SearchOutlined,
  BookOutlined,
  MobileOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSchools,
  createSchool,
  getAllCampuses,
  deleteSchool,
  updateSchool,
  getAllClassrooms,
} from '../../../services/schoolService';
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
  const [searchParams] = useSearchParams();
  const initialCampusId = searchParams.get('campusId');

  const { user } = useAuthStore();
  const role = user?.role;

  const [isSchoolModalVisible, setIsSchoolModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string | null>(initialCampusId);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | '3d'>('table');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (initialCampusId) {
      setSelectedCampusFilter(initialCampusId);
    }
  }, [initialCampusId]);

  const [schoolForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['schools', selectedCampusFilter],
    queryFn: () => getSchools({ page: 0, size: 200, campusId: selectedCampusFilter || undefined }),
  });
  const schools = (Array.isArray(data) ? data : data?.content) || [];

  const { data: devicesData } = useQuery({
    queryKey: ['devices', { size: 500 }],
    queryFn: () => getDevices({ page: 0, size: 500 }),
  });
  const allDevices = (Array.isArray(devicesData) ? devicesData : devicesData?.content) || [];

  const getSchoolDeviceCount = (schoolId: string) =>
    allDevices.filter((d: any) => d.school?.id === schoolId).length;

  const { data: campusesData } = useQuery({
    queryKey: ['campuses'],
    queryFn: () => getAllCampuses(),
  });

  const { data: classroomsData } = useQuery({
    queryKey: ['classrooms_all'],
    queryFn: () => getAllClassrooms(),
  });
  const allClassrooms = (Array.isArray(classroomsData) ? classroomsData : classroomsData?.content) || [];

  const getSchoolClassroomCount = (schoolId: string) =>
    allClassrooms.filter((c: any) => c.schoolId === schoolId).length;

  const createSchoolMutation = useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      message.success('Đã thêm trường học mới!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || error.response?.data?.detail || 'Không thể tạo trường học');
    },
  });

  const updateSchoolMutation = useMutation({
    mutationFn: (values: any) => updateSchool(editingId as string, values),
    onSuccess: () => {
      message.success('Đã cập nhật trường học!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || error.response?.data?.detail || 'Không thể cập nhật trường học');
    },
  });

  const deleteSchoolMutation = useMutation({
    mutationFn: deleteSchool,
    onSuccess: () => {
      message.success('Đã xóa trường học!');
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      if (selectedSchoolId) setSelectedSchoolId(null);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || error.response?.data?.detail || 'Không thể xóa trường học');
    },
  });

  const handleModalClose = () => {
    setIsSchoolModalVisible(false);
    setEditingId(null);
    schoolForm.resetFields();
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    schoolForm.setFieldsValue({
      name: record.name,
      code: record.code,
      campusId: record.campusId,
      address: record.address,
    });
    setIsSchoolModalVisible(true);
    setSelectedSchoolId(null);
  };

  const displaySchools = useMemo(() => {
    let list = selectedCampusFilter ? schools.filter((s: any) => s.campusId === selectedCampusFilter) : schools;
    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s: any) =>
          s.name?.toLowerCase().includes(q) ||
          s.code?.toLowerCase().includes(q) ||
          s.campusName?.toLowerCase().includes(q) ||
          s.address?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [schools, selectedCampusFilter, searchText]);

  const layout = getGridLayout(displaySchools.length, 16);
  const selectedSchool = displaySchools.find((s: any) => s.id === selectedSchoolId) as any;

  const columns = [
    {
      title: 'Trường học',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <BankOutlined className="text-emerald-400" />
          </div>
          <div>
            <div
              className="text-white font-semibold text-sm cursor-pointer hover:text-emerald-400 transition-colors"
              onClick={() => navigate(`/devices?schoolId=${record.id}`)}
            >
              {name}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">📍 {record.address || 'Chưa cập nhật địa chỉ'}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Mã Trường',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (code: string) => (
        <Tag className="border-0 bg-emerald-500/15 text-emerald-300 font-mono-data px-2.5 py-0.5 rounded-md">{code}</Tag>
      ),
    },
    {
      title: 'Khu vực (Campus)',
      dataIndex: 'campusName',
      key: 'campusName',
      width: 180,
      render: (campusName: string) => (
        <Tag className="border-0 bg-blue-500/15 text-blue-300 px-2.5 py-0.5 rounded-md">{campusName || 'Chưa gán'}</Tag>
      ),
    },
    {
      title: 'Lớp học',
      key: 'classrooms',
      width: 130,
      render: (_: any, record: any) => {
        const count = record.classroomCount ?? getSchoolClassroomCount(record.id);
        return (
          <Tag
            className="border-0 bg-amber-500/15 text-amber-300 font-semibold px-3 py-0.5 rounded-full cursor-pointer"
            onClick={() => {
              localStorage.setItem('lastSelectedSchoolId', record.id);
              navigate('/classrooms');
            }}
          >
            <BookOutlined className="mr-1" /> {count} lớp
          </Tag>
        );
      },
    },
    {
      title: 'Thiết bị',
      key: 'devices',
      width: 130,
      render: (_: any, record: any) => {
        const count = record.deviceCount ?? getSchoolDeviceCount(record.id);
        return (
          <Tag
            className="border-0 bg-cyan-500/15 text-cyan-300 font-semibold px-3 py-0.5 rounded-full cursor-pointer"
            onClick={() => navigate(`/devices?schoolId=${record.id}`)}
          >
            <MobileOutlined className="mr-1" /> {count} máy
          </Tag>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 320,
      render: (_: any, record: any) => (
        <Space size="small" wrap>
          <Button
            size="small"
            icon={<MobileOutlined />}
            onClick={() => navigate(`/devices?schoolId=${record.id}`)}
            style={{
              background: 'rgba(0,212,255,0.12)',
              borderColor: 'rgba(0,212,255,0.35)',
              color: '#00d4ff',
              borderRadius: 8,
            }}
          >
            Thiết bị & Điều khiển
          </Button>
          <Button
            size="small"
            icon={<BookOutlined />}
            onClick={() => {
              localStorage.setItem('lastSelectedSchoolId', record.id);
              navigate('/classrooms');
            }}
            style={{
              background: 'rgba(16,185,129,0.12)',
              borderColor: 'rgba(16,185,129,0.35)',
              color: '#34d399',
              borderRadius: 8,
            }}
          >
            Xem Lớp
          </Button>
          {role === 'SUPER_ADMIN' && (
            <>
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
                title="Xóa trường học này?"
                onConfirm={() => deleteSchoolMutation.mutate(record.id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#050507' }}>
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
                background: 'linear-gradient(135deg, rgba(0,180,120,0.25), rgba(255,215,0,0.15))',
                border: '1px solid rgba(0,180,120,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BankOutlined style={{ color: '#00b878', fontSize: 16 }} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
                Quản lý Trường học
              </Title>
              <div style={{ color: '#9ca3af', fontSize: 12 }}>
                Hiển thị {displaySchools.length} trường học · {allClassrooms.length} lớp học · {allDevices.length} thiết bị
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View mode toggle */}
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
              { key: '3d', icon: <BuildOutlined />, label: 'Mô hình 3D' },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key as any)}
                style={{
                  background: viewMode === key ? 'rgba(0,180,120,0.2)' : 'transparent',
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

          {role === 'SUPER_ADMIN' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingId(null);
                schoolForm.resetFields();
                if (selectedCampusFilter) {
                  schoolForm.setFieldsValue({ campusId: selectedCampusFilter });
                }
                setIsSchoolModalVisible(true);
              }}
              style={{
                background: 'linear-gradient(135deg,#00b878,#008855)',
                border: 'none',
                height: 38,
                borderRadius: 10,
                fontWeight: 600,
              }}
            >
              Thêm Trường học
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {viewMode === 'table' ? (
          <div className="flex-1 p-6 overflow-y-auto">
            <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg">
              <div className="flex flex-wrap items-center gap-4 mb-5">
                <Input
                  placeholder="Tìm kiếm tên trường, mã trường, địa chỉ..."
                  prefix={<SearchOutlined className="text-gray-500" />}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  allowClear
                  className="max-w-md bg-[#1f2028] border-[#2e303a] text-white"
                />
                {role === 'SUPER_ADMIN' && (
                  <Select
                    allowClear
                    placeholder="Lọc theo Khu vực (Campus)"
                    style={{ width: 240 }}
                    value={selectedCampusFilter}
                    onChange={v => {
                      setSelectedCampusFilter(v || null);
                      setSelectedSchoolId(null);
                    }}
                    options={campusesData?.map((c: any) => ({ value: c.id, label: c.name })) || []}
                  />
                )}
              </div>

              <Table
                columns={columns}
                dataSource={displaySchools}
                loading={isLoading}
                rowKey="id"
                pagination={{ pageSize: 10, className: 'custom-pagination' }}
                className="custom-dark-table"
              />
            </Card>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, position: 'relative' }}>
              {isLoading && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(5,5,7,0.9)',
                    zIndex: 20,
                  }}
                >
                  <Spin size="large" />
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

                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
                  <planeGeometry args={[200, 200]} />
                  <meshStandardMaterial color="#0a0f0a" roughness={0.95} />
                </mesh>
                <gridHelper args={[200, 80, '#0a2a1a', '#060e08']} position={[0, -0.08, 0]} />

                {displaySchools.map((school: any, i: number) => (
                  <SchoolBuilding3D
                    key={school.id}
                    position={layout[i]}
                    name={school.name}
                    campusName={school.campusName}
                    deviceCount={school.deviceCount || getSchoolDeviceCount(school.id)}
                    classroomCount={school.classroomCount || getSchoolClassroomCount(school.id)}
                    isSelected={selectedSchoolId === school.id}
                    onClick={() => setSelectedSchoolId(selectedSchoolId === school.id ? null : school.id)}
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
            </div>

            {/* Right panel in 3D view */}
            <div
              style={{
                width: 320,
                background: 'rgba(10,10,15,0.95)',
                borderLeft: '1px solid rgba(46,48,58,0.7)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {selectedSchool ? (
                <div style={{ padding: 20, borderBottom: '1px solid rgba(46,48,58,0.5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ color: '#00b878', fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>
                      TRƯỜNG ĐÃ CHỌN
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Tooltip title="Xem Thiết bị Trường">
                        <Button
                          size="small"
                          type="text"
                          icon={<EyeOutlined />}
                          style={{ color: '#ffd700' }}
                          onClick={() => navigate(`/devices?schoolId=${selectedSchool.id}`)}
                        />
                      </Tooltip>
                      {role === 'SUPER_ADMIN' && (
                        <>
                          <Tooltip title="Sửa">
                            <Button
                              size="small"
                              type="text"
                              icon={<EditOutlined />}
                              style={{ color: '#3b82f6' }}
                              onClick={() => handleEdit(selectedSchool)}
                            />
                          </Tooltip>
                          <Popconfirm
                            title="Xóa trường?"
                            onConfirm={() => {
                              deleteSchoolMutation.mutate(selectedSchool.id);
                              setSelectedSchoolId(null);
                            }}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <Tooltip title="Xóa">
                              <Button size="small" type="text" icon={<DeleteOutlined />} danger />
                            </Tooltip>
                          </Popconfirm>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{selectedSchool.name}</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <Tag className="border-0 bg-emerald-500/20 text-emerald-400">{selectedSchool.code}</Tag>
                    {selectedSchool.campusName && (
                      <Tag className="border-0 bg-blue-500/20 text-blue-400">{selectedSchool.campusName}</Tag>
                    )}
                  </div>
                  <Button
                    type="primary"
                    icon={<MobileOutlined />}
                    onClick={() => navigate(`/devices?schoolId=${selectedSchool.id}`)}
                    className="w-full mt-2"
                    style={{ background: '#00b878', border: 'none' }}
                  >
                    Thiết bị & Điều khiển
                  </Button>
                </div>
              ) : (
                <div style={{ padding: 20, borderBottom: '1px solid rgba(46,48,58,0.5)', textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: 12 }}>Chọn trường trên mô hình 3D hoặc danh sách bên dưới</div>
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                {displaySchools.map((school: any) => {
                  const isActive = school.id === selectedSchoolId;
                  return (
                    <div
                      key={school.id}
                      onClick={() => setSelectedSchoolId(isActive ? null : school.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        marginBottom: 6,
                        cursor: 'pointer',
                        background: isActive ? 'rgba(0,180,120,0.12)' : 'rgba(20,21,30,0.5)',
                        border: `1px solid ${isActive ? 'rgba(0,180,120,0.4)' : 'rgba(46,48,58,0.4)'}`,
                      }}
                    >
                      <div className="text-white font-semibold text-sm">{school.name}</div>
                      <div className="text-gray-400 text-xs mt-1">
                        📍 {school.campusName || 'N/A'} · 📱 {getSchoolDeviceCount(school.id)} máy
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* CRUD Modal */}
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
        <Form
          form={schoolForm}
          layout="vertical"
          onFinish={values => {
            if (editingId) updateSchoolMutation.mutate(values);
            else createSchoolMutation.mutate(values);
          }}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="campusId" label="Khu vực (Campus)" rules={[{ required: true, message: 'Vui lòng chọn khu vực' }]}>
            <Select
              showSearch
              placeholder="Chọn khu vực"
              optionFilterProp="label"
              options={campusesData?.map((c: any) => ({ value: c.id, label: c.name })) || []}
            />
          </Form.Item>
          <Form.Item name="name" label="Tên trường" rules={[{ required: true, message: 'Vui lòng nhập tên trường' }]}>
            <Input placeholder="VD: THCS Phan Văn Trị" />
          </Form.Item>
          <Form.Item name="code" label="Mã trường" rules={[{ required: true, message: 'Vui lòng nhập mã trường' }]}>
            <Input placeholder="VD: PVT" />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}>
            <Input placeholder="VD: 123 Đường Lê Đức Thọ, Quận Gò Vấp" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SchoolListPage;
