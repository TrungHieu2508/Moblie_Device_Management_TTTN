import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Table,
  Tag,
  Input,
  Button,
  Select,
  Space,
  Card,
  Typography,
  Modal,
  Form,
  Drawer,
  message,
  Slider,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  PlusOutlined,
  MobileOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../../../config/axios';
import { getDevices, updateDevice, deleteDevice, sendDeviceCommand } from '../../../services/deviceService';
import { createEnrollmentProfile } from '../../../services/enrollmentService';
import { getAllCampuses, getSchools, getClassrooms } from '../../../services/schoolService';
import { useAuthStore } from '../../../store/authStore';
import type { DeviceDto } from '../../../services/deviceService';

const { Title } = Typography;

const getStatusTag = (status: string) => {
  switch (status) {
    case 'ONLINE':
      return (
        <Tag color="success" className="border-0 bg-green-500/20 text-green-400 font-medium px-3 py-1 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2 animate-pulse"></div>Đang hoạt động
        </Tag>
      );
    case 'OFFLINE':
      return (
        <Tag color="default" className="border-0 bg-gray-500/20 text-gray-400 font-medium px-3 py-1 rounded-full">
          <div className="w-2 h-2 rounded-full bg-gray-500 inline-block mr-2"></div>Mất kết nối
        </Tag>
      );
    case 'WARNING':
      return (
        <Tag color="warning" className="border-0 bg-yellow-500/20 text-yellow-400 font-medium px-3 py-1 rounded-full">
          <div className="w-2 h-2 rounded-full bg-yellow-500 inline-block mr-2"></div>Cảnh báo
        </Tag>
      );
    case 'CRITICAL':
      return (
        <Tag color="error" className="border-0 bg-red-500/20 text-red-400 font-medium px-3 py-1 rounded-full">
          <div className="w-2 h-2 rounded-full bg-red-500 inline-block mr-2 animate-bounce"></div>Nguy hiểm
        </Tag>
      );
    default:
      return <Tag>{status}</Tag>;
  }
};

const DeviceListPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [campusFilter, setCampusFilter] = useState<string | undefined>(searchParams.get('campusId') || undefined);
  const [schoolFilter, setSchoolFilter] = useState<string | undefined>(searchParams.get('schoolId') || undefined);
  const [classroomFilter, setClassroomFilter] = useState<string | undefined>(searchParams.get('classroomId') || undefined);
  const [page, setPage] = useState(0);
  const [bulkLoading, setBulkLoading] = useState(false);
  const { user } = useAuthStore();
  const role = user?.role;

  useEffect(() => {
    const sId = searchParams.get('schoolId');
    const cId = searchParams.get('classroomId');
    const campId = searchParams.get('campusId');
    if (campId) setCampusFilter(campId);
    if (sId) setSchoolFilter(sId);
    if (cId) setClassroomFilter(cId);
  }, [searchParams]);

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
  const selectedSchoolIdForForm = Form.useWatch('schoolId', registerForm);
  const selectedCampusIdForEditForm = Form.useWatch('campusId', editForm);
  const selectedSchoolIdForEditForm = Form.useWatch('schoolId', editForm);

  const { data: classroomsForFilter = [] } = useQuery({
    queryKey: ['classrooms', schoolFilter],
    queryFn: () => getClassrooms(schoolFilter as string),
    enabled: !!schoolFilter && schoolFilter !== 'all',
  });

  const { data: classroomsForForm = [], isLoading: isClassroomsLoadingForm } = useQuery({
    queryKey: ['classrooms', selectedSchoolIdForForm],
    queryFn: () => getClassrooms(selectedSchoolIdForForm),
    enabled: !!selectedSchoolIdForForm,
  });

  const { data: classroomsForEdit = [], isLoading: isClassroomsLoadingEdit } = useQuery({
    queryKey: ['classrooms', selectedSchoolIdForEditForm],
    queryFn: () => getClassrooms(selectedSchoolIdForEditForm),
    enabled: !!selectedSchoolIdForEditForm,
  });

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<{
    minBattery?: number;
    maxBattery?: number;
    androidVersion?: string;
  }>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['devices', page, statusFilter, campusFilter, schoolFilter, classroomFilter, searchText, advancedFilters],
    queryFn: () =>
      getDevices({
        page,
        size: 10,
        status: statusFilter === 'all' ? undefined : statusFilter,
        campusId: campusFilter === 'all' ? undefined : campusFilter,
        schoolId: schoolFilter === 'all' ? undefined : schoolFilter,
        classroomId: classroomFilter === 'all' ? undefined : classroomFilter,
        search: searchText || undefined,
        ...advancedFilters,
      }),
  });

  const deviceList: DeviceDto[] = (Array.isArray(data) ? data : data?.content) || [];

  const { data: campuses } = useQuery({
    queryKey: ['campuses'],
    queryFn: getAllCampuses,
  });

  const { data: schoolsData } = useQuery({
    queryKey: ['schools', { size: 200 }],
    queryFn: () => getSchools({ page: 0, size: 200 }),
  });
  const schools = (Array.isArray(schoolsData) ? schoolsData : schoolsData?.content) || [];

  const filteredSchoolsForToolbar =
    campusFilter && campusFilter !== 'all'
      ? schools.filter((s: any) => s.campusId === campusFilter)
      : schools;

  const createEnrollmentMutation = useMutation({
    mutationFn: createEnrollmentProfile,
    onSuccess: data => {
      message.success('Tạo Mã ghi danh thành công!');
      setCreatedCode(data.code);
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      registerForm.resetFields();
    },
    onError: () => message.error('Có lỗi xảy ra khi tạo mã'),
  });

  const handleCreateCode = (values: any) => {
    createEnrollmentMutation.mutate(values);
  };

  const handleApplyFilters = (values: any) => {
    setAdvancedFilters({
      minBattery: values.battery?.[0],
      maxBattery: values.battery?.[1],
      androidVersion: values.androidVersion,
    });
    setIsFilterDrawerVisible(false);
    setPage(0);
  };

  const updateDeviceMutation = useMutation({
    mutationFn: (data: {
      id: string;
      payload: { deviceName?: string; notes?: string; campusId?: string; schoolId?: string; classroomId?: string };
    }) => updateDevice(data.id, data.payload),
    onSuccess: () => {
      message.success('Cập nhật thiết bị thành công!');
      setIsEditModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || error.response?.data?.detail || 'Cập nhật thiết bị thất bại');
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: deleteDevice,
    onSuccess: () => {
      message.success('Xóa thiết bị thành công!');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: () => message.error('Xóa thiết bị thất bại'),
  });

  const handleQuickCommand = async (device: DeviceDto, commandType: string, label: string, payload: Record<string, any> = {}) => {
    try {
      await sendDeviceCommand(device.id, commandType, payload);
      message.success(`Đã gửi lệnh "${label}" tới ${device.deviceName || device.model}`);
    } catch (error: any) {
      message.error(error.response?.data?.message || `Không thể gửi lệnh ${label}`);
    }
  };

  const handleBulkCommand = async (commandType: string, label: string, payload: Record<string, any> = {}) => {
    if (deviceList.length === 0) {
      message.warning('Không có thiết bị nào trong danh sách hiện tại để điều khiển.');
      return;
    }
    setBulkLoading(true);
    try {
      await Promise.allSettled(deviceList.map(d => sendDeviceCommand(d.id, commandType, payload)));
      message.success(`Đã gửi lệnh "${label}" tới ${deviceList.length} thiết bị đang hiển thị!`);
    } catch {
      message.error(`Có lỗi xảy ra khi gửi lệnh hàng loạt.`);
    } finally {
      setBulkLoading(false);
    }
  };

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
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
            <MobileOutlined className="text-purple-400 text-base" />
          </div>
          <div>
            <a
              onClick={() => navigate(`/devices/${record.id}`)}
              className="text-white hover:text-cyan-400 font-semibold transition-colors block"
            >
              {text || record.model || 'Unknown Device'}
            </a>
            <span className="text-xs text-gray-500 font-mono-data">{(record as any).macAddress || record.id.slice(0, 8)}</span>
          </div>
        </Space>
      ),
    },
    {
      title: 'Model & OS',
      dataIndex: 'model',
      key: 'model',
      render: (text: string, record: DeviceDto) => (
        <Space direction="vertical" size={0}>
          <span className="text-gray-300 font-medium">{text || 'Android'}</span>
          <span className="text-gray-500 text-xs">Android {record.androidVersion || 'N/A'}</span>
        </Space>
      ),
    },
    {
      title: 'Cơ sở & Trường học',
      key: 'location',
      render: (_: any, record: DeviceDto) => (
        <Space direction="vertical" size={0}>
          <span className="text-gray-200 font-medium">{record.school?.name || 'Chưa gán trường'}</span>
          <span className="text-gray-500 text-xs">
            {record.campus?.name ? `${record.campus.name}` : 'Chưa gán cơ sở'}
            {record.classroom?.name ? ` · Lớp ${record.classroom.name}` : ''}
          </span>
        </Space>
      ),
    },
    {
      title: 'Ứng dụng đang mở',
      dataIndex: 'currentApp',
      key: 'currentApp',
      render: (currentApp: any) => {
        if (!currentApp) return <span className="text-gray-500">Màn hình chính</span>;
        const appName = currentApp.appName || currentApp.packageName || 'Unknown';
        return (
          <Tag color="cyan" className="border-0 bg-cyan-500/20 text-cyan-400 font-medium px-2.5 py-0.5 rounded-md">
            {appName}
          </Tag>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Điều khiển & Thao tác',
      key: 'actions',
      width: 340,
      render: (_: any, record: DeviceDto) => (
        <Space size="small" wrap>
          <Tooltip title="Xem màn hình Live & Điều khiển chi tiết">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/devices/${record.id}`)}
              style={{
                background: 'rgba(0,212,255,0.12)',
                borderColor: 'rgba(0,212,255,0.35)',
                color: '#00d4ff',
                borderRadius: 8,
              }}
            >
              Chi tiết / Live
            </Button>
          </Tooltip>
          <Tooltip title="Khóa màn hình thiết bị ngay">
            <Button
              size="small"
              icon={<LockOutlined />}
              onClick={() =>
                handleQuickCommand(record, 'LOCK_SCREEN', 'Khóa màn hình', {
                  message: 'Quản trị viên đã khóa màn hình thiết bị!',
                })
              }
              style={{
                background: 'rgba(239,68,68,0.12)',
                borderColor: 'rgba(239,68,68,0.35)',
                color: '#f87171',
                borderRadius: 8,
              }}
            />
          </Tooltip>
          <Tooltip title="Mở khóa màn hình">
            <Button
              size="small"
              icon={<UnlockOutlined />}
              onClick={() => handleQuickCommand(record, 'UNLOCK_DEVICE', 'Mở khóa màn hình')}
              style={{
                background: 'rgba(34,197,94,0.12)',
                borderColor: 'rgba(34,197,94,0.35)',
                color: '#4ade80',
                borderRadius: 8,
              }}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa thiết bị & Gán lớp">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingDevice(record);
                editForm.setFieldsValue({
                  deviceName: record.deviceName,
                  campusId: record.campus?.id,
                  schoolId: record.school?.id,
                  classroomId: record.classroom?.id,
                });
                setIsEditModalVisible(true);
              }}
              style={{
                background: 'rgba(59,130,246,0.12)',
                borderColor: 'rgba(59,130,246,0.35)',
                color: '#60a5fa',
                borderRadius: 8,
              }}
            />
          </Tooltip>
          <Tooltip title="Xóa thiết bị">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => showDeleteConfirm(record)}
              style={{ borderRadius: 8 }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <Title level={3} className="!m-0 !text-white">
            Quản lý & Điều khiển Thiết bị
          </Title>
          <p className="text-gray-400 mt-1">
            Giám sát, xem màn hình trực tiếp và điều khiển từ xa thiết bị học sinh theo trường học / lớp học
          </p>
        </div>
        <Space wrap>
          <Button
            icon={<LockOutlined />}
            loading={bulkLoading}
            onClick={() =>
              handleBulkCommand('LOCK_SCREEN', 'Khóa màn hình hàng loạt', {
                message: 'Quản trị viên đã khóa màn hình toàn bộ lớp học!',
              })
            }
            style={{
              background: 'rgba(239,68,68,0.14)',
              borderColor: 'rgba(239,68,68,0.4)',
              color: '#f87171',
              height: 40,
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            Khóa tất cả đang lọc ({deviceList.length})
          </Button>
          <Button
            icon={<UnlockOutlined />}
            loading={bulkLoading}
            onClick={() => handleBulkCommand('UNLOCK_DEVICE', 'Mở khóa hàng loạt')}
            style={{
              background: 'rgba(34,197,94,0.14)',
              borderColor: 'rgba(34,197,94,0.4)',
              color: '#4ade80',
              height: 40,
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            Mở khóa tất cả
          </Button>
          <Button
            icon={<ClearOutlined />}
            loading={bulkLoading}
            onClick={() => handleBulkCommand('CLEAR_BACKGROUND_APPS', 'Dọn RAM hàng loạt')}
            style={{
              background: 'rgba(0,212,255,0.14)',
              borderColor: 'rgba(0,212,255,0.4)',
              color: '#00d4ff',
              height: 40,
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            Dọn RAM tất cả
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="bg-[var(--color-primary)] border-0 h-10 px-5 font-semibold rounded-xl"
            onClick={() => {
              setCreatedCode(null);
              registerForm.resetFields();
              if (role !== 'SUPER_ADMIN') {
                const defaultCampusId = user?.campusId || campuses?.[0]?.id;
                if (defaultCampusId) {
                  registerForm.setFieldsValue({ campusId: defaultCampusId });
                }
              }
              setIsRegisterModalVisible(true);
            }}
          >
            Tạo Mã Ghi Danh (QR)
          </Button>
        </Space>
      </div>

      <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg">
        {/* Cascading Filter Toolbar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Input
            placeholder="Tìm kiếm tên thiết bị, model, MAC..."
            prefix={<SearchOutlined className="text-gray-500" />}
            className="max-w-xs bg-[#1f2028] border-[#2e303a] text-white"
            allowClear
            onChange={e => {
              setSearchText(e.target.value);
              setPage(0);
            }}
          />
          <Select
            defaultValue="all"
            className="w-40"
            onChange={value => {
              setStatusFilter(value);
              setPage(0);
            }}
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'ONLINE', label: '🟢 Đang hoạt động' },
              { value: 'OFFLINE', label: '⚫ Mất kết nối' },
              { value: 'WARNING', label: '🟡 Cảnh báo' },
              { value: 'CRITICAL', label: '🔴 Nguy hiểm' },
            ]}
          />
          {role === 'SUPER_ADMIN' && (
            <Select
              value={campusFilter || 'all'}
              className="w-48"
              onChange={value => {
                setCampusFilter(value);
                setSchoolFilter('all');
                setClassroomFilter('all');
                setPage(0);
              }}
              options={[
                { value: 'all', label: 'Tất cả Cơ sở (Campus)' },
                ...(campuses?.map((c: any) => ({ value: c.id, label: c.name })) || []),
              ]}
            />
          )}
          <Select
            value={schoolFilter || 'all'}
            className="w-52"
            onChange={value => {
              setSchoolFilter(value);
              setClassroomFilter('all');
              setPage(0);
            }}
            options={[
              { value: 'all', label: 'Tất cả Trường học' },
              ...(filteredSchoolsForToolbar?.map((s: any) => ({ value: s.id, label: s.name })) || []),
            ]}
          />
          {schoolFilter && schoolFilter !== 'all' && (
            <Select
              value={classroomFilter || 'all'}
              className="w-44"
              onChange={value => {
                setClassroomFilter(value);
                setPage(0);
              }}
              options={[
                { value: 'all', label: 'Tất cả Lớp học' },
                ...((classroomsForFilter as any[])?.map((c: any) => ({ value: c.id, label: `Lớp ${c.name}` })) || []),
              ]}
            />
          )}
          <Button
            icon={<FilterOutlined />}
            className="bg-[#1f2028] border-[#2e303a] text-gray-300 hover:text-white"
            onClick={() => setIsFilterDrawerVisible(true)}
          >
            Bộ lọc Pin/OS
          </Button>
          <Button
            onClick={() => refetch()}
            icon={<ReloadOutlined />}
            className="ml-auto bg-[#1f2028] border-[#2e303a] text-gray-300 hover:text-white"
          >
            Làm mới
          </Button>
        </div>

        {/* Data Table */}
        <Table
          columns={columns}
          dataSource={deviceList}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: page + 1,
            pageSize: 10,
            total: data?.totalElements || (Array.isArray(data) ? data.length : 0),
            onChange: p => setPage(p - 1),
            className: 'custom-pagination',
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
            <Typography.Text className="text-gray-400 block mb-2">
              Quét mã QR dưới đây để cấu hình thiết bị:
            </Typography.Text>

            <div className="flex justify-center my-6 bg-white p-4 rounded-xl inline-block">
              <QRCodeSVG
                value={JSON.stringify({
                  serverUrl: API_BASE_URL.replace('/api', ''),
                  code: createdCode,
                })}
                size={200}
                level="M"
              />
            </div>

            <Typography.Text className="text-gray-400 block mb-2">Hoặc nhập thủ công mã Ghi Danh sau:</Typography.Text>
            <Typography.Title
              level={2}
              className="!text-[var(--color-primary)] tracking-widest bg-[var(--color-primary)]/10 py-4 rounded-xl border border-[var(--color-primary)]/30"
            >
              {createdCode}
            </Typography.Title>
            <Button type="primary" className="mt-6 w-full" onClick={() => setIsRegisterModalVisible(false)}>
              Đóng
            </Button>
          </div>
        ) : (
          <Form form={registerForm} layout="vertical" onFinish={handleCreateCode} className="mt-4">
            <Form.Item name="campusId" label="Cơ sở (Campus)" rules={[{ required: true, message: 'Vui lòng chọn cơ sở' }]}>
              <Select
                placeholder="Chọn cơ sở"
                disabled={role !== 'SUPER_ADMIN' && !!user?.campusId}
                onChange={() => registerForm.setFieldValue('schoolId', undefined)}
              >
                {campuses?.map((campus: any) => (
                  <Select.Option key={campus.id} value={campus.id}>
                    {campus.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="schoolId"
              label="Trường học"
              rules={[{ required: true, message: 'Vui lòng chọn trường học' }]}
            >
              <Select placeholder="Chọn trường học" disabled={!selectedCampusIdForForm}>
                {schools
                  .filter((school: any) => school.campusId === selectedCampusIdForForm)
                  .map((school: any) => (
                    <Select.Option key={school.id} value={school.id}>
                      {school.name}
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>
            <Form.Item name="classroomId" label="Lớp học (Tùy chọn)">
              <Select
                placeholder="Chọn lớp học (nếu có)"
                disabled={!selectedSchoolIdForForm}
                loading={isClassroomsLoadingForm}
                allowClear
              >
                {classroomsForForm?.map((classroom: any) => (
                  <Select.Option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="expiresInDays" label="Số ngày hiệu lực" initialValue={7}>
              <Input type="number" min={1} max={30} suffix="Ngày" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              className="w-full bg-[var(--color-primary)] border-0 mt-4"
              loading={createEnrollmentMutation.isPending}
            >
              Tạo Mã
            </Button>
          </Form>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Chỉnh sửa Thiết bị & Phân bổ Lớp học"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        className="dark-modal"
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditDevice} className="mt-4">
          <Form.Item name="deviceName" label="Tên thiết bị (Ví dụ: Máy Học Sinh 01 - Lớp 10A1)">
            <Input placeholder="Nhập tên dễ nhớ cho thiết bị..." />
          </Form.Item>
          <Form.Item name="campusId" label="Cơ sở (Campus)">
            <Select
              placeholder="Chọn cơ sở"
              disabled={role !== 'SUPER_ADMIN'}
              onChange={() => {
                editForm.setFieldValue('schoolId', undefined);
                editForm.setFieldValue('classroomId', undefined);
              }}
              allowClear={role === 'SUPER_ADMIN'}
            >
              {campuses?.map((campus: any) => (
                <Select.Option key={campus.id} value={campus.id}>
                  {campus.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="schoolId" label="Trường học">
            <Select
              placeholder="Chọn trường học"
              onChange={() => editForm.setFieldValue('classroomId', undefined)}
              allowClear
            >
              {(selectedCampusIdForEditForm
                ? schools.filter((school: any) => school.campusId === selectedCampusIdForEditForm)
                : schools
              ).map((school: any) => (
                <Select.Option key={school.id} value={school.id}>
                  {school.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="classroomId" label="Lớp học">
            <Select
              placeholder="Chọn lớp học"
              disabled={!selectedSchoolIdForEditForm}
              loading={isClassroomsLoadingEdit}
              allowClear
            >
              {classroomsForEdit?.map((cr: any) => (
                <Select.Option key={cr.id} value={cr.id}>
                  {cr.name}
                </Select.Option>
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
