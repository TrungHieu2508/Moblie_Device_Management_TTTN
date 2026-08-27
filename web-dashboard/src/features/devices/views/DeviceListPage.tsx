import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Table, Tag, Input, Button, Select, Space, Card, Typography, Modal, Form, Drawer, message, Slider } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined, PlusOutlined, MobileOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDevices, updateDevice, deleteDevice } from '../../../services/deviceService';
import { createEnrollmentProfile } from '../../../services/enrollmentService';
import { getAllCampuses, getSchools } from '../../../services/schoolService';
import { useAuthStore } from '../../../store/authStore';
import type { DeviceDto } from '../../../services/deviceService';

const { Title } = Typography;

// API data mapped later inside the component

const getStatusTag = (status: string) => {
  switch (status) {
    case 'ONLINE':
      return <Tag color="success" className="border-0 bg-green-500/20 text-green-400 font-medium px-3 py-1 rounded-full"><div className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2 animate-pulse"></div>Đang hoạt động</Tag>;
    case 'OFFLINE':
      return <Tag color="default" className="border-0 bg-gray-500/20 text-gray-400 font-medium px-3 py-1 rounded-full"><div className="w-2 h-2 rounded-full bg-gray-500 inline-block mr-2"></div>Mất kết nối</Tag>;
    case 'WARNING':
      return <Tag color="warning" className="border-0 bg-yellow-500/20 text-yellow-400 font-medium px-3 py-1 rounded-full"><div className="w-2 h-2 rounded-full bg-yellow-500 inline-block mr-2"></div>Cảnh báo</Tag>;
    case 'CRITICAL':
      return <Tag color="error" className="border-0 bg-red-500/20 text-red-400 font-medium px-3 py-1 rounded-full"><div className="w-2 h-2 rounded-full bg-red-500 inline-block mr-2 animate-bounce"></div>Nguy hiểm</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

const getBatteryColor = (level: number) => {
  if (level > 50) return 'text-green-400';
  if (level > 20) return 'text-yellow-400';
  return 'text-red-500 font-bold';
};

const DeviceListPage = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [campusFilter, setCampusFilter] = useState<string | undefined>(undefined);
  const [schoolFilter, setSchoolFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const { user } = useAuthStore();
  const role = user?.role;
  
  // States for Modal and Drawer
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [registerForm] = Form.useForm();
  
  // Edit Device State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceDto | null>(null);
  const [editForm] = Form.useForm();

  const queryClient = useQueryClient();
  const selectedCampusIdForForm = Form.useWatch('campusId', registerForm);
  const selectedCampusIdForEditForm = Form.useWatch('campusId', editForm);
  
  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<{
    minBattery?: number;
    maxBattery?: number;
    androidVersion?: string;
  }>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['devices', page, statusFilter, campusFilter, schoolFilter, searchText, advancedFilters],
    queryFn: () => getDevices({ 
      page, 
      size: 10, 
      status: statusFilter === 'all' ? undefined : statusFilter,
      campusId: campusFilter === 'all' ? undefined : campusFilter,
      schoolId: schoolFilter === 'all' ? undefined : schoolFilter,
      search: searchText || undefined,
      ...advancedFilters
    }),
  });

  const { data: campuses } = useQuery({
    queryKey: ['campuses'],
    queryFn: getAllCampuses,
  });

  const { data: schoolsData } = useQuery({
    queryKey: ['schools', { size: 100 }], // Fetch all for dropdown
    queryFn: () => getSchools({ page: 0, size: 100 }),
  });
  const schools = schoolsData?.content || [];

  const createEnrollmentMutation = useMutation({
    mutationFn: createEnrollmentProfile,
    onSuccess: (data) => {
      message.success('Tạo Mã ghi danh thành công!');
      setCreatedCode(data.code);
      registerForm.resetFields();
    },
    onError: () => message.error('Có lỗi xảy ra khi tạo mã')
  });

  const handleCreateCode = (values: any) => {
    createEnrollmentMutation.mutate(values);
  };

  const handleApplyFilters = (values: any) => {
    setAdvancedFilters({
      minBattery: values.battery?.[0],
      maxBattery: values.battery?.[1],
      androidVersion: values.androidVersion
    });
    setIsFilterDrawerVisible(false);
    setPage(0);
  };

  const updateDeviceMutation = useMutation({
    mutationFn: (data: { id: string, payload: { deviceName?: string, notes?: string, campusId?: string, schoolId?: string } }) => updateDevice(data.id, data.payload),
    onSuccess: () => {
      message.success('Cập nhật thiết bị thành công!');
      setIsEditModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Cập nhật thiết bị thất bại');
    }
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: deleteDevice,
    onSuccess: () => {
      message.success('Xóa thiết bị thành công!');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: () => message.error('Xóa thiết bị thất bại')
  });

  const handleEditDevice = (values: any) => {
    if (editingDevice) {
      updateDeviceMutation.mutate({ id: editingDevice.id, payload: values });
    }
  };

  const showDeleteConfirm = (device: DeviceDto) => {
    Modal.confirm({
      title: 'Xác nhận xóa thiết bị',
      content: `Bạn có chắc chắn muốn xóa thiết bị "${device.deviceName || device.model}"? Hành động này không thể hoàn tác.`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk() {
        deleteDeviceMutation.mutate(device.id);
      },
    });
  };

  const columns = [
    {
      title: 'Tên thiết bị',
      dataIndex: 'deviceName',
      key: 'deviceName',
      render: (text: string, record: DeviceDto) => (
        <Space>
          <MobileOutlined className="text-gray-400 text-lg" />
          <a onClick={() => navigate(`/devices/${record.id}`)} className="text-white hover:text-[var(--color-primary)] font-medium transition-colors">
            {text || record.model || 'Unknown Device'}
          </a>
        </Space>
      ),
    },
    {
      title: 'Model & OS',
      dataIndex: 'model',
      key: 'model',
      render: (text: string, record: DeviceDto) => (
        <Space direction="vertical" size={0}>
          <span className="text-gray-300">{text}</span>
          <span className="text-gray-500 text-xs">Android {record.androidVersion}</span>
        </Space>
      )
    },
    {
      title: 'Cơ sở',
      dataIndex: 'campus',
      key: 'campus',
      render: (_: any, record: DeviceDto) => (
        <span className="text-gray-300">{record.campus?.name || 'Chưa gán'}</span>
      )
    },
    {
      title: 'Trường học',
      dataIndex: 'school',
      key: 'school',
      render: (_: any, record: DeviceDto) => (
        <Space direction="vertical" size={0}>
          <span className="text-gray-400">{record.school?.name || 'Chưa gán'}</span>
          <span className="text-gray-500 text-xs">{record.classroom?.name ? `Lớp ${record.classroom.name}` : ''}</span>
        </Space>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: DeviceDto) => (
        <Space>
          <Button 
            type="link" 
            onClick={() => {
              setEditingDevice(record);
              editForm.setFieldsValue({ 
                deviceName: record.deviceName, 
                notes: record.notes || '',
                campusId: record.campus?.id,
                schoolId: record.school?.id
              });
              setIsEditModalVisible(true);
            }}
          >
            Sửa
          </Button>
          <Button type="link" danger onClick={() => showDeleteConfirm(record)}>
            Xóa
          </Button>
        </Space>
      ),
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!m-0 !text-white">Quản lý Thiết bị</Title>
          <p className="text-gray-400 mt-1">Giám sát và điều khiển toàn bộ thiết bị trong hệ thống</p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          className="bg-[var(--color-primary)] border-0 h-10 px-6 font-medium"
          onClick={() => {
            setCreatedCode(null);
            setIsRegisterModalVisible(true);
          }}
        >
          Tạo Mã Ghi Danh
        </Button>
      </div>

      <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Input 
            placeholder="Tìm kiếm thiết bị, học sinh..." 
            prefix={<SearchOutlined className="text-gray-500" />}
            className="max-w-md bg-[#1f2028] border-[#2e303a] text-white hover:border-gray-500 focus:border-[var(--color-primary)]"
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Select
            defaultValue="all"
            className="w-40"
            onChange={(value) => setStatusFilter(value)}
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'ONLINE', label: 'Đang hoạt động' },
              { value: 'WARNING', label: 'Cảnh báo' },
              { value: 'CRITICAL', label: 'Nguy hiểm' },
              { value: 'OFFLINE', label: 'Mất kết nối' },
            ]}
          />
          {role === 'SUPER_ADMIN' ? (
            <Select
              defaultValue="all"
              className="w-48"
              onChange={(value) => setCampusFilter(value)}
              options={[
                { value: 'all', label: 'Tất cả Cơ sở' },
                ...(campuses?.map(c => ({ value: c.id, label: c.name })) || [])
              ]}
            />
          ) : (
            <Select
              defaultValue="all"
              className="w-48"
              onChange={(value) => setSchoolFilter(value)}
              options={[
                { value: 'all', label: 'Tất cả Trường học' },
                ...(schools?.map((s: any) => ({ value: s.id, label: s.name })) || [])
              ]}
            />
          )}
          <Button 
            icon={<FilterOutlined />} 
            className="bg-[#1f2028] border-[#2e303a] text-gray-300 hover:text-white"
            onClick={() => setIsFilterDrawerVisible(true)}
          >
            Bộ lọc nâng cao
          </Button>
          <Button onClick={() => refetch()} icon={<ReloadOutlined />} className="ml-auto bg-[#1f2028] border-[#2e303a] text-gray-300 hover:text-white">
            Làm mới
          </Button>
        </div>

        {/* Data Table */}
        <Table 
          columns={columns} 
          dataSource={data?.content || []} 
          loading={isLoading}
          rowKey="id"
          pagination={{ 
            current: page + 1,
            pageSize: 10,
            total: data?.totalElements || 0,
            onChange: (page) => setPage(page - 1),
            className: 'custom-pagination' 
          }}
          className="custom-dark-table"
        />
      </Card>

      {/* Modal Tạo Mã Ghi Danh */}
      <Modal
        title="Tạo Mã Ghi Danh (Enrollment Code)"
        open={isRegisterModalVisible}
        onCancel={() => setIsRegisterModalVisible(false)}
        footer={null}
        className="dark-modal"
      >
        {createdCode ? (
          <div className="text-center py-8">
            <Typography.Text className="text-gray-400 block mb-2">Quét mã QR dưới đây để cấu hình thiết bị:</Typography.Text>
            
            <div className="flex justify-center my-6 bg-white p-4 rounded-xl inline-block">
              <QRCodeSVG 
                value={JSON.stringify({ 
                  serverUrl: (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace('/api', ''),
                  code: createdCode 
                })} 
                size={200}
                level="M"
              />
            </div>
            
            <Typography.Text className="text-gray-400 block mb-2">Hoặc nhập thủ công mã Ghi Danh sau:</Typography.Text>
            <Typography.Title level={2} className="!text-[var(--color-primary)] tracking-widest bg-[var(--color-primary)]/10 py-4 rounded-xl border border-[var(--color-primary)]/30">
              {createdCode}
            </Typography.Title>
            <Typography.Text className="text-gray-400 block mt-4">
              Mã này sẽ tự động cấu hình Server URL và đưa thiết bị vào hệ thống với thông tin Cơ sở và Trường học đã chọn.
            </Typography.Text>
            <Button type="primary" className="mt-6 w-full" onClick={() => setIsRegisterModalVisible(false)}>
              Đóng
            </Button>
          </div>
        ) : (
          <Form form={registerForm} layout="vertical" onFinish={handleCreateCode} className="mt-4">
            <Form.Item name="campusId" label="Cơ sở (Campus)" rules={[{ required: true, message: 'Vui lòng chọn cơ sở' }]}>
              <Select 
                placeholder="Chọn cơ sở"
                onChange={() => registerForm.setFieldValue('schoolId', undefined)}
              >
                {campuses?.map(campus => (
                  <Select.Option key={campus.id} value={campus.id}>{campus.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="schoolId" label="Trường học" rules={[{ required: true, message: 'Vui lòng chọn trường học' }]}>
              <Select placeholder="Chọn trường học" disabled={!selectedCampusIdForForm}>
                {schools
                  .filter((school: any) => school.campusId === selectedCampusIdForForm)
                  .map((school: any) => (
                  <Select.Option key={school.id} value={school.id}>{school.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="expiresInDays" label="Số ngày hiệu lực" initialValue={7}>
              <Input type="number" min={1} max={30} suffix="Ngày" />
            </Form.Item>
            
            <Button type="primary" htmlType="submit" className="w-full bg-[var(--color-primary)] border-0 mt-4" loading={createEnrollmentMutation.isPending}>
              Tạo Mã
            </Button>
          </Form>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Chỉnh sửa Thiết bị"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        className="dark-modal"
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditDevice}>
          <Form.Item name="deviceName" label="Tên thiết bị (Tùy chỉnh)">
            <Input placeholder="Nhập tên dễ nhớ cho thiết bị..." />
          </Form.Item>
          <Form.Item name="campusId" label="Cơ sở (Campus) - Tùy chọn chuyển">
            <Select 
              placeholder="Chọn cơ sở"
              onChange={() => editForm.setFieldValue('schoolId', undefined)}
              allowClear
            >
              {campuses?.map(campus => (
                <Select.Option key={campus.id} value={campus.id}>{campus.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="schoolId" label="Trường học - Tùy chọn chuyển">
            <Select placeholder="Chọn trường học" disabled={!selectedCampusIdForEditForm} allowClear>
              {schools
                .filter((school: any) => school.campusId === selectedCampusIdForEditForm)
                .map((school: any) => (
                <Select.Option key={school.id} value={school.id}>{school.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea placeholder="Ghi chú tình trạng thiết bị..." rows={3} />
          </Form.Item>
          <Space className="w-full justify-end mt-4">
            <Button onClick={() => setIsEditModalVisible(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={updateDeviceMutation.isPending}>
              Lưu thay đổi
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* Drawer Bộ lọc nâng cao */}
      <Drawer
        title="Bộ lọc nâng cao"
        placement="right"
        onClose={() => setIsFilterDrawerVisible(false)}
        open={isFilterDrawerVisible}
        className="dark-drawer"
      >
        <Form layout="vertical" onFinish={handleApplyFilters}>
          <Form.Item name="battery" label="Khoảng dung lượng Pin (%)">
            <Slider range defaultValue={[0, 100]} marks={{ 0: '0%', 20: '20%', 100: '100%' }} />
          </Form.Item>
          <Form.Item name="androidVersion" label="Phiên bản Android">
            <Select allowClear placeholder="Tất cả phiên bản">
              <Select.Option value="11">Android 11</Select.Option>
              <Select.Option value="12">Android 12</Select.Option>
              <Select.Option value="13">Android 13</Select.Option>
              <Select.Option value="14">Android 14</Select.Option>
            </Select>
          </Form.Item>
          
          <Button type="primary" htmlType="submit" className="w-full bg-[var(--color-primary)] border-0 mt-6">
            Áp dụng bộ lọc
          </Button>
          <Button 
            className="w-full mt-2 border-gray-600 text-gray-300 hover:text-white"
            onClick={() => {
              setAdvancedFilters({});
              setIsFilterDrawerVisible(false);
              setPage(0);
            }}
          >
            Xóa bộ lọc
          </Button>
        </Form>
      </Drawer>
    </div>
  );
};

export default DeviceListPage;
