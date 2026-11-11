import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Button, Modal, Form, Input, Typography, message, Popconfirm, Tooltip, Spin, Tag, Card, Table, Space } from 'antd';
import {
  PlusOutlined,
  EnvironmentOutlined,
  DeleteOutlined,
  EditOutlined,
  TableOutlined,
  GlobalOutlined,
  SearchOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllCampuses, createCampus, deleteCampus, updateCampus, getSchools } from '../../../services/schoolService';
import { Campus3DPin } from '../../../components/3d/Campus3DPin';
import { CampusMapGround } from '../../../components/3d/CampusMapGround';

const { Title } = Typography;

const PIN_COLORS = ['#EA4335', '#1A73E8', '#FBBC04', '#34A853', '#9C27B0', '#FF6D00'];

const getMapPositions = (count: number): [number, number, number][] => {
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

const CityMap = ({
  campuses,
  selectedCampusId,
  schools,
  onPinClick,
}: {
  campuses: any[];
  selectedCampusId: string | null;
  schools: any[];
  onPinClick: (id: string) => void;
}) => {
  const positions = useMemo(() => getMapPositions(campuses.length), [campuses.length]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[20, 35, 15]}
        intensity={1.8}
        castShadow
        color="#fff8f0"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <directionalLight position={[-15, 20, -20]} intensity={0.5} color="#c8e0ff" />
      <hemisphereLight args={['#b8d4f0', '#6b8a50', 0.5]} />
      <CampusMapGround />

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

const CampusListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | '3d'>('table');
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const { data: campuses = [], isLoading } = useQuery({
    queryKey: ['campuses'],
    queryFn: () => getAllCampuses(),
  });

  const { data: schoolsData } = useQuery({
    queryKey: ['schools', { size: 200 }],
    queryFn: () => getSchools({ page: 0, size: 200 }),
  });
  const schools = (Array.isArray(schoolsData) ? schoolsData : schoolsData?.content) || [];

  const createMutation = useMutation({
    mutationFn: (values: any) => createCampus(values),
    onSuccess: () => {
      message.success('Đã thêm khu vực mới!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['campuses'] });
    },
    onError: (e: any) => message.error(e.response?.data?.message || e.response?.data?.detail || 'Không thể tạo khu vực'),
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => updateCampus(editingId as string, values),
    onSuccess: () => {
      message.success('Đã cập nhật khu vực!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['campuses'] });
    },
    onError: (e: any) => message.error(e.response?.data?.message || e.response?.data?.detail || 'Không thể cập nhật'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCampus(id),
    onSuccess: () => {
      message.success('Đã xóa khu vực!');
      setSelectedCampusId(null);
      queryClient.invalidateQueries({ queryKey: ['campuses'] });
    },
    onError: (e: any) => message.error(e.response?.data?.message || e.response?.data?.detail || 'Không thể xóa'),
  });

  const handleModalClose = () => {
    setIsModalVisible(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({ name: record.name, code: record.code, address: record.address });
    setIsModalVisible(true);
  };

  const filteredCampuses = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return campuses as any[];
    return (campuses as any[]).filter(
      (c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q)
    );
  }, [campuses, searchText]);

  const selectedCampus = (campuses as any[]).find((c: any) => c.id === selectedCampusId);

  const columns = [
    {
      title: '#',
      key: 'idx',
      width: 60,
      render: (_: any, __: any, index: number) => (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
          style={{ background: PIN_COLORS[index % PIN_COLORS.length] }}
        >
          {index + 1}
        </div>
      ),
    },
    {
      title: 'Tên Khu vực (Campus)',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <div>
          <div className="text-white font-semibold text-sm">{name}</div>
          <div className="text-xs text-gray-500 mt-0.5">📍 {record.address || 'Chưa cập nhật địa chỉ'}</div>
        </div>
      ),
    },
    {
      title: 'Mã Khu vực',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code: string) => (
        <Tag className="border-0 bg-purple-500/15 text-purple-300 font-mono-data px-2.5 py-0.5 rounded-md">{code}</Tag>
      ),
    },
    {
      title: 'Trường trực thuộc',
      key: 'schoolCount',
      width: 180,
      render: (_: any, record: any) => {
        const count = schools.filter((s: any) => s.campusId === record.id).length;
        return (
          <Tag
            color={count > 0 ? 'success' : 'default'}
            className="border-0 bg-emerald-500/15 text-emerald-400 font-semibold px-3 py-1 rounded-full cursor-pointer"
            onClick={() => navigate(`/schools?campusId=${record.id}`)}
          >
            <BankOutlined className="mr-1.5" />
            {count} trường học
          </Tag>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 280,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            size="small"
            icon={<BankOutlined />}
            onClick={() => navigate(`/schools?campusId=${record.id}`)}
            style={{
              background: 'rgba(16,185,129,0.12)',
              borderColor: 'rgba(16,185,129,0.35)',
              color: '#34d399',
              borderRadius: 8,
            }}
          >
            Xem Trường
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
            title="Xóa khu vực này?"
            description="Lưu ý: Cần xóa hoặc chuyển các trường trực thuộc trước khi xóa khu vực."
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }}>
              Xóa
            </Button>
          </Popconfirm>
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
                background: 'linear-gradient(135deg,#EA4335,#FBBC04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(234,67,53,0.35)',
              }}
            >
              <EnvironmentOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: '#fff' }}>
                Quản lý Khu vực (Campus)
              </Title>
              <div style={{ color: '#9ca3af', fontSize: 12 }}>
                Tổng cộng {(campuses as any[]).length} khu vực · {schools.length} trường học trực thuộc
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View mode switch */}
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
              { key: '3d', icon: <GlobalOutlined />, label: 'Bản đồ 3D' },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key as any)}
                style={{
                  background: viewMode === key ? 'rgba(170,59,255,0.22)' : 'transparent',
                  color: viewMode === key ? '#d8b4fe' : '#9ca3af',
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
              setIsModalVisible(true);
            }}
            style={{
              background: 'linear-gradient(135deg, #aa3bff, #7b2ae8)',
              border: 'none',
              height: 38,
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            Thêm Khu vực
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {viewMode === 'table' ? (
          <div className="flex-1 p-6 overflow-y-auto">
            <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <Input
                  placeholder="Tìm kiếm theo tên khu vực, mã hoặc địa chỉ..."
                  prefix={<SearchOutlined className="text-gray-500" />}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  allowClear
                  className="max-w-md bg-[#1f2028] border-[#2e303a] text-white"
                />
                <div className="text-xs text-gray-400">
                  Hiển thị <span className="text-white font-semibold">{filteredCampuses.length}</span> khu vực
                </div>
              </div>

              <Table
                columns={columns}
                dataSource={filteredCampuses}
                loading={isLoading}
                rowKey="id"
                pagination={{ pageSize: 10, className: 'custom-pagination' }}
                className="custom-dark-table"
              />
            </Card>
          </div>
        ) : (
          <>
            {/* 3D Map Canvas */}
            <div style={{ flex: 1, position: 'relative' }}>
              {isLoading && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(15,15,25,0.9)',
                    zIndex: 20,
                  }}
                >
                  <Spin size="large" />
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
                  onPinClick={id => setSelectedCampusId(prev => (prev === id ? null : id))}
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
            </div>

            {/* Dark Right Side Panel */}
            <div
              style={{
                width: 320,
                background: '#111218',
                borderLeft: '1px solid #2e303a',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {selectedCampus ? (
                <div style={{ padding: 20, borderBottom: '1px solid #2e303a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: '#f87171', fontWeight: 700, letterSpacing: '0.1em' }}>
                      KHU VỰC ĐANG CHỌN
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Tooltip title="Sửa">
                        <Button
                          size="small"
                          type="text"
                          icon={<EditOutlined />}
                          style={{ color: '#60a5fa' }}
                          onClick={() => handleEdit(selectedCampus)}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="Xóa khu vực?"
                        onConfirm={() => deleteMutation.mutate(selectedCampus.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="Xóa">
                          <Button size="small" type="text" icon={<DeleteOutlined />} danger />
                        </Tooltip>
                      </Popconfirm>
                    </div>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{selectedCampus.name}</div>
                  <Tag className="border-0 bg-purple-500/20 text-purple-300 font-mono-data">{selectedCampus.code}</Tag>
                  {selectedCampus.address && (
                    <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>📍 {selectedCampus.address}</div>
                  )}
                  <Button
                    type="primary"
                    icon={<BankOutlined />}
                    onClick={() => navigate(`/schools?campusId=${selectedCampus.id}`)}
                    className="w-full mt-4"
                    style={{ background: '#10b981', border: 'none', borderRadius: 8 }}
                  >
                    Xem {schools.filter((s: any) => s.campusId === selectedCampus.id).length} Trường trực thuộc
                  </Button>
                </div>
              ) : (
                <div style={{ padding: 20, borderBottom: '1px solid #2e303a', textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: 12 }}>Chọn một Khu vực bên dưới hoặc trên bản đồ 3D</div>
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                {(campuses as any[]).map((campus: any, i: number) => {
                  const isActive = campus.id === selectedCampusId;
                  const color = PIN_COLORS[i % PIN_COLORS.length];
                  return (
                    <div
                      key={campus.id}
                      onClick={() => setSelectedCampusId(isActive ? null : campus.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        marginBottom: 6,
                        cursor: 'pointer',
                        background: isActive ? 'rgba(170,59,255,0.14)' : '#181922',
                        border: `1px solid ${isActive ? '#aa3bff' : '#2e303a'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="text-white text-sm font-semibold truncate">{campus.name}</div>
                          <div className="text-gray-400 text-xs truncate">{campus.address}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      <Modal
        title={editingId ? 'Chỉnh sửa Khu vực (Campus)' : 'Thêm Khu vực mới'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={handleModalClose}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        className="dark-modal"
        okText={editingId ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={v => (editingId ? updateMutation.mutate(v) : createMutation.mutate(v))}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="name" label="Tên khu vực" rules={[{ required: true, message: 'Vui lòng nhập tên khu vực' }]}>
            <Input placeholder="VD: Cơ sở Quận Gò Vấp" />
          </Form.Item>
          <Form.Item name="code" label="Mã khu vực" rules={[{ required: true, message: 'Vui lòng nhập mã khu vực' }]}>
            <Input placeholder="VD: CS_GV" />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}>
            <Input placeholder="VD: 12 Nguyễn Văn Bảo, Quận Gò Vấp, TP.HCM" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CampusListPage;
