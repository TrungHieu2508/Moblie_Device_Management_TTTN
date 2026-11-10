import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  Tag,
  Modal,
  Select,
  message,
  Spin,
  Empty,
  Calendar,
  Badge,
  DatePicker,
  Drawer,
  Table,
  Form,
  Input,
  Popconfirm,
  Popover,
  Row,
  Col,
  Progress,
  Tooltip,
} from 'antd';
import type { Dayjs } from 'dayjs';
import {
  PlayCircleOutlined,
  StopOutlined,
  VideoCameraOutlined,
  CalendarOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SettingOutlined,
  DesktopOutlined,
  WifiOutlined,
  AlertOutlined,
  LockOutlined,
  UnlockOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  BellOutlined,
  ClearOutlined,
  SearchOutlined,
  ReloadOutlined,
  QrcodeOutlined,
  CheckCircleOutlined,
  ExpandOutlined,
  MobileOutlined,
  AppstoreOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import {
  getActiveSessions,
  startSession,
  activateScheduledSession,
  endSession,
  scheduleSession,
  getScheduledSessions,
} from '../../../services/classSessionService';
import { getClassrooms, createClassroom, updateClassroom, deleteClassroom } from '../../../services/schoolService';
import { getDevices, assignDeviceLocation } from '../../../services/deviceService';
import type { DeviceDto } from '../../../services/deviceService';
import { getAlerts, updateAlertStatus, resolveAllAlerts } from '../../../services/alertService';
import type { AlertDto } from '../../../services/alertService';
import { useWebSocket } from '../../../hooks/useWebSocket';
import axiosInstance from '../../../config/axios';
import { useNavigate, useParams } from 'react-router-dom';

const { Title, Text } = Typography;

const TeacherDashboard = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isScheduleModalVisible, setIsScheduleModalVisible] = useState(false);
  const [isClassroomDrawerVisible, setIsClassroomDrawerVisible] = useState(false);
  const [isClassroomModalVisible, setIsClassroomModalVisible] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<any>(null);
  const [classroomForm] = Form.useForm();

  // Filter states for Student Device Grid
  const [filterClassroomId, setFilterClassroomId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Live Screen Streaming Modal state
  const [streamingDevice, setStreamingDevice] = useState<DeviceDto | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningDevice, setAssigningDevice] = useState<DeviceDto | null>(null);
  const [targetAssignClassroomId, setTargetAssignClassroomId] = useState<string | undefined>(undefined);

  const { schoolId: urlSchoolId } = useParams();
  const effectiveSchoolId = urlSchoolId || user?.schoolId;

  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [scheduleDates, setScheduleDates] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  // Connect to real-time WebSocket (passes streamingDevice.deviceId when watching live screen)
  const {
    isConnected: wsConnected,
    screenFrame,
    clearScreenFrame,
    lastEvent,
    liveDevicesMap,
  } = useWebSocket(streamingDevice?.deviceId);

  // Refetch queries when WebSocket receives status or alert changes
  useEffect(() => {
    if (!lastEvent) return;
    if (
      lastEvent.type === 'DEVICE_STATUS' ||
      lastEvent.type === 'NEW_ALERT' ||
      lastEvent.type === 'ALERT_STATUS_CHANGED'
    ) {
      queryClient.invalidateQueries({ queryKey: ['teacherDevices'] });
      queryClient.invalidateQueries({ queryKey: ['teacherAlerts'] });
    }
  }, [lastEvent, queryClient]);

  const {
    data: activeSessions = [],
    isLoading: isSessionsLoading,
    isError: isSessionsError,
    error: sessionsError,
  } = useQuery({
    queryKey: ['activeSessions', effectiveSchoolId],
    queryFn: () => getActiveSessions(effectiveSchoolId),
    refetchInterval: 30000,
  });

  const {
    data: scheduledSessions = [],
    isLoading: isScheduledLoading,
    isError: isScheduledError,
    error: scheduledError,
  } = useQuery({
    queryKey: ['scheduledSessions', effectiveSchoolId],
    queryFn: () => getScheduledSessions(effectiveSchoolId),
    refetchInterval: 30000,
  });

  // Fetch classrooms for this school
  const { data: classrooms = [], isLoading: isClassroomsLoading } = useQuery({
    queryKey: ['classrooms', effectiveSchoolId],
    queryFn: () => getClassrooms(effectiveSchoolId as string),
    enabled: !!effectiveSchoolId,
  });

  // Fetch all devices for Teacher supervision
  const {
    data: devicesData,
    isLoading: isDevicesLoading,
    refetch: refetchDevices,
  } = useQuery({
    queryKey: ['teacherDevices', effectiveSchoolId],
    queryFn: () => getDevices({ size: 200 }),
    refetchInterval: 5000,
  });

  // Fetch recent unresolved alerts
  const {
    data: alertsData,
    isLoading: isAlertsLoading,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ['teacherAlerts'],
    queryFn: () => getAlerts({ page: 0, size: 10, status: 'UNRESOLVED' }),
    refetchInterval: 10000,
  });

  const createClassroomMutation = useMutation({
    mutationFn: (data: any) => createClassroom(effectiveSchoolId as string, data),
    onSuccess: () => {
      message.success('Đã thêm lớp học mới');
      setIsClassroomModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể thêm lớp học mới');
    },
  });

  const updateClassroomMutation = useMutation({
    mutationFn: (data: any) => updateClassroom(editingClassroom.id, data),
    onSuccess: () => {
      message.success('Cập nhật lớp học thành công');
      setIsClassroomModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể cập nhật lớp học');
    },
  });

  const deleteClassroomMutation = useMutation({
    mutationFn: deleteClassroom,
    onSuccess: () => {
      message.success('Đã xóa lớp học');
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể xóa lớp học');
    },
  });

  const handleSaveClassroom = (values: any) => {
    if (editingClassroom) {
      updateClassroomMutation.mutate(values);
    } else {
      createClassroomMutation.mutate(values);
    }
  };

  const scheduleSessionMutation = useMutation({
    mutationFn: (data: { classroomId: string; startTime: string; endTime: string }) =>
      scheduleSession(data.classroomId, user!.id, data.startTime, data.endTime),
    onSuccess: () => {
      message.success('Đã lên lịch lớp học thành công!');
      setIsScheduleModalVisible(false);
      setScheduleDates([null, null]);
      queryClient.invalidateQueries({ queryKey: ['scheduledSessions'] });
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể lên lịch lớp học.');
    },
  });

  const startNowMutation = useMutation({
    mutationFn: (classroomId: string) => startSession(classroomId, user!.id),
    onSuccess: (session) => {
      message.success('Đã bắt đầu phiên học trực tiếp!');
      setIsScheduleModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      queryClient.invalidateQueries({ queryKey: ['scheduledSessions'] });
      navigate(`/live-classes/${session.id}${effectiveSchoolId ? `?schoolId=${effectiveSchoolId}` : ''}`);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể bắt đầu lớp học.');
    },
  });

  const activateScheduledMutation = useMutation({
    mutationFn: (sessionId: string) => activateScheduledSession(sessionId),
    onSuccess: (session) => {
      message.success('Đã kích hoạt lớp học sang trạng thái Live!');
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      queryClient.invalidateQueries({ queryKey: ['scheduledSessions'] });
      navigate(`/live-classes/${session.id}${effectiveSchoolId ? `?schoolId=${effectiveSchoolId}` : ''}`);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể kích hoạt lớp học.');
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: endSession,
    onSuccess: () => {
      message.success('Đã kết thúc/hủy lớp học!');
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      queryClient.invalidateQueries({ queryKey: ['scheduledSessions'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể kết thúc lớp học.');
    },
  });

  const handleScheduleSession = () => {
    if (!selectedClassroomId || !scheduleDates[0] || !scheduleDates[1]) {
      message.warning('Vui lòng chọn lớp học và thời gian đầy đủ');
      return;
    }
    scheduleSessionMutation.mutate({
      classroomId: selectedClassroomId,
      startTime: scheduleDates[0].toISOString(),
      endTime: scheduleDates[1].toISOString(),
    });
  };

  const handleEndSession = (sessionId: string) => {
    Modal.confirm({
      title: 'Kết thúc lớp học?',
      content: 'Bạn có chắc chắn muốn kết thúc lớp học này không? Các thiết bị sẽ không còn bị ràng buộc trong phiên này.',
      okText: 'Kết thúc',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => endSessionMutation.mutate(sessionId),
    });
  };

  // Device command helpers
  const isDeviceConnected = (status?: string) =>
    status === 'ONLINE' || status === 'WARNING' || status === 'CRITICAL';

  const handleSendCommand = async (
    deviceUuid: string,
    commandType: string,
    payloadData: any = {},
    silent = false
  ) => {
    try {
      await axiosInstance.post(`/devices/${deviceUuid}/commands`, {
        commandType,
        payload: payloadData,
      });
      if (!silent) {
        message.success(`Đã gửi lệnh ${commandType} thành công!`);
      }
    } catch (error: any) {
      if (!silent) {
        message.error(
          error?.response?.data?.message || `Không thể gửi lệnh ${commandType} tới thiết bị.`
        );
      }
    }
  };

  const handleOpenLiveStream = async (device: DeviceDto) => {
    clearScreenFrame();
    setStreamingDevice(device);
    await handleSendCommand(device.id, 'START_STREAM', {}, true);
    message.info(`Đang yêu cầu phát trực tiếp màn hình từ ${device.deviceName}...`);
  };

  const handleCloseLiveStream = async () => {
    if (streamingDevice) {
      await handleSendCommand(streamingDevice.id, 'STOP_STREAM', {}, true);
    }
    clearScreenFrame();
    setStreamingDevice(null);
  };

  const rawDevices: DeviceDto[] =
    (Array.isArray(devicesData)
      ? devicesData
      : devicesData?.content || (devicesData as any)?.items) || [];

  // Merge real-time WebSocket status/metrics/currentApp into device list
  const allDevices: (DeviceDto & { liveCurrentApp?: any })[] = rawDevices.map((d) => {
    const live = liveDevicesMap[d.deviceId];
    return {
      ...d,
      status: (live?.status as any) || d.status,
      metrics: live?.metrics ? { ...d.metrics, ...live.metrics } : d.metrics,
      liveCurrentApp: live?.currentApp || d.currentApp || d.metrics?.currentApp,
    };
  });

  // Filtered devices
  const filteredDevices = allDevices.filter((d) => {
    if (filterClassroomId !== 'ALL') {
      if (filterClassroomId === 'UNASSIGNED') {
        if (d.classroom?.id) return false;
      } else if (d.classroom?.id !== filterClassroomId) {
        return false;
      }
    }
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'ONLINE_ALL') {
        if (!isDeviceConnected(d.status)) return false;
      } else if (d.status !== filterStatus) {
        return false;
      }
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchName = d.deviceName?.toLowerCase().includes(kw);
      const matchId = d.deviceId?.toLowerCase().includes(kw);
      const matchModel = d.model?.toLowerCase().includes(kw);
      const matchClass = d.classroom?.name?.toLowerCase().includes(kw);
      if (!matchName && !matchId && !matchModel && !matchClass) return false;
    }
    return true;
  });

  const onlineDevices = allDevices.filter((d) => isDeviceConnected(d.status));
  const warningOrCriticalDevices = allDevices.filter(
    (d) => d.status === 'WARNING' || d.status === 'CRITICAL'
  );
  const recentAlerts: AlertDto[] =
    (Array.isArray(alertsData) ? alertsData : alertsData?.content || (alertsData as any)?.items) ||
    [];

  const handleBulkCommand = (commandType: string, payloadData: any = {}) => {
    const targets = filteredDevices.filter((d) => isDeviceConnected(d.status));
    if (targets.length === 0) {
      message.warning('Không có thiết bị nào đang trực tuyến trong danh sách lọc để nhận lệnh!');
      return;
    }
    targets.forEach((d) => {
      handleSendCommand(d.id, commandType, payloadData, true);
    });
    message.success(`Đã gửi lệnh ${commandType} tới ${targets.length} thiết bị trực tuyến!`);
  };

  const promptBulkMessage = () => {
    let msg = 'Giáo viên yêu cầu các em tập trung vào bài giảng!';
    Modal.confirm({
      title: 'Gửi Thông Báo Nhắc Nhở Tới Học Sinh',
      content: (
        <Input.TextArea
          rows={3}
          defaultValue={msg}
          onChange={(e) => (msg = e.target.value)}
          className="mt-4"
          placeholder="Nhập nội dung thông báo hiển thị trên màn hình học sinh..."
        />
      ),
      okText: 'Gửi Thông Báo',
      cancelText: 'Hủy',
      onOk: () => handleBulkCommand('SHOW_ALERT', { message: msg }),
    });
  };

  const promptSingleMessage = (device: DeviceDto) => {
    let msg = `Giáo viên nhắc nhở ${device.deviceName}: Tập trung vào bài học!`;
    Modal.confirm({
      title: `Gửi Cảnh Báo Tới ${device.deviceName}`,
      content: (
        <Input.TextArea
          rows={3}
          defaultValue={msg}
          onChange={(e) => (msg = e.target.value)}
          className="mt-4"
        />
      ),
      okText: 'Gửi ngay',
      cancelText: 'Hủy',
      onOk: () => handleSendCommand(device.id, 'SHOW_ALERT', { message: msg }),
    });
  };

  const handleAssignClassroom = async () => {
    if (!assigningDevice) return;
    try {
      await assignDeviceLocation(assigningDevice.id, {
        schoolId: effectiveSchoolId,
        classroomId: targetAssignClassroomId || undefined,
      });
      message.success(`Đã cập nhật lớp học cho thiết bị ${assigningDevice.deviceName}`);
      setIsAssignModalOpen(false);
      setAssigningDevice(null);
      refetchDevices();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể gán lớp học cho thiết bị');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await updateAlertStatus(alertId, 'RESOLVED', 'Giáo viên đã xử lý');
      message.success('Đã đánh dấu xử lý cảnh báo!');
      refetchAlerts();
      refetchDevices();
    } catch {
      message.error('Không thể cập nhật trạng thái cảnh báo');
    }
  };

  const handleResolveAllAlerts = async () => {
    try {
      await resolveAllAlerts();
      message.success('Đã xử lý toàn bộ cảnh báo!');
      refetchAlerts();
      refetchDevices();
    } catch {
      message.error('Không thể xử lý tất cả cảnh báo');
    }
  };

  if (isSessionsLoading || isScheduledLoading)
    return <Spin size="large" className="block mx-auto mt-20" />;

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'IT_ADMIN';
  const displayedSessions = activeSessions;
  const displayedScheduled = scheduledSessions;
  const allSessionsToDisplay = [...displayedSessions, ...displayedScheduled];

  const getListData = (value: Dayjs) => {
    const listData: any[] = [];
    allSessionsToDisplay.forEach((s: any) => {
      const startTimeStr = s.status === 'ACTIVE' ? s.startedAt : s.scheduledStartTime;
      if (!startTimeStr) return;
      const start = new Date(startTimeStr);
      if (
        start.getDate() === value.date() &&
        start.getMonth() === value.month() &&
        start.getFullYear() === value.year()
      ) {
        const type = s.status === 'ACTIVE' ? 'success' : 'warning';
        listData.push({
          type,
          content: `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${
            s.classroomName
          }`,
        });
      }
    });
    return listData;
  };

  const dateCellRender = (value: Dayjs) => {
    const listData = getListData(value);

    const popoverContent =
      listData.length > 0 ? (
        <ul className="m-0 p-0 list-none">
          {listData.map((item, index) => (
            <li key={index} className="text-sm py-1 border-b border-[#2e303a] last:border-0">
              <Badge
                status={item.type as any}
                text={<span className="text-gray-300">{item.content}</span>}
              />
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-gray-500 text-sm">Không có lịch học</span>
      );

    return (
      <Popover
        content={<div className="max-w-[200px]">{popoverContent}</div>}
        title={
          <span className="text-gray-200 font-bold border-b border-[#2e303a] pb-1 block">
            {value.format('DD/MM/YYYY')}
          </span>
        }
        trigger="hover"
        placement="top"
        overlayInnerStyle={{ backgroundColor: '#1f2028', borderColor: '#2e303a' }}
      >
        <div className="w-full h-full min-h-[80px] p-1 cursor-pointer">
          <ul className="m-0 p-0 list-none">
            {listData.map((item, index) => (
              <li key={index} className="text-xs truncate">
                <Badge
                  status={item.type as any}
                  text={<span className="text-gray-300">{item.content}</span>}
                />
              </li>
            ))}
          </ul>
        </div>
      </Popover>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header & Quick Teacher Actions */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <Title level={3} className="!m-0 !text-white flex items-center gap-3 mb-1">
            <span>
              {isSuperAdmin && urlSchoolId
                ? 'Bảng Điều Khiển Trường Học'
                : isSuperAdmin
                ? 'Quản lý toàn bộ Lớp học'
                : 'Trung Tâm Giám Sát & Điều Khiển Lớp Học'}
            </span>
            <Tag
              color={wsConnected ? 'success' : 'error'}
              className="text-xs font-normal border-0"
            >
              {wsConnected ? '● Realtime Connected' : '○ Disconnected'}
            </Tag>
          </Title>
          {isSessionsError && (
            <div className="mb-2">
              <Tag color="error">Lỗi API Active: {String(sessionsError)}</Tag>
            </div>
          )}
          {isScheduledError && (
            <div className="mb-2">
              <Tag color="error">Lỗi API Scheduled: {String(scheduledError)}</Tag>
            </div>
          )}
          <Text className="text-gray-400 block">
            Theo dõi màn hình trực tiếp, kiểm soát ứng dụng mạng xã hội và điều khiển thiết bị học sinh theo thời gian thực
          </Text>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            icon={<QrcodeOutlined />}
            className="h-10 px-4 font-medium text-cyan-400 border-cyan-500/40 bg-[#1f2028] hover:border-cyan-400"
            onClick={() => navigate('/enrollments')}
          >
            Mã Ghi Danh QR
          </Button>
          <Button
            icon={<SettingOutlined />}
            className="h-10 px-4 font-medium text-white border-gray-600 bg-[#1f2028] hover:border-purple-500 hover:text-purple-400"
            onClick={() => setIsClassroomDrawerVisible(true)}
          >
            Quản lý Lớp học
          </Button>
          <Button
            type="primary"
            icon={<CalendarOutlined />}
            className="h-10 px-5 font-medium border-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
            onClick={() => setIsScheduleModalVisible(true)}
          >
            Bắt đầu / Lên lịch học
          </Button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <Row gutter={[16, 16]} className="mb-8">
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="bg-[#1f2028] border-[#2e303a] rounded-xl cursor-pointer hover:border-blue-500/50 transition-all"
            onClick={() => navigate('/devices')}
          >
            <div className="flex items-center justify-between">
              <div>
                <Text className="text-gray-400 text-xs uppercase tracking-wider block mb-1">
                  Tổng Thiết Bị Học Sinh
                </Text>
                <Title level={2} className="!m-0 !text-white">
                  {allDevices.length}
                </Title>
                <Text className="text-xs text-blue-400 mt-1 block">
                  Nhấn để xem danh sách chi tiết →
                </Text>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <DesktopOutlined className="text-2xl text-blue-400" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            className="bg-[#1f2028] border-green-500/30 rounded-xl cursor-pointer hover:border-green-500 transition-all"
            onClick={() => setFilterStatus(filterStatus === 'ONLINE_ALL' ? 'ALL' : 'ONLINE_ALL')}
          >
            <div className="flex items-center justify-between">
              <div>
                <Text className="text-green-400 text-xs uppercase tracking-wider block mb-1">
                  Đang Trực Tuyến (Online)
                </Text>
                <Title level={2} className="!m-0 !text-green-400">
                  {onlineDevices.length}{' '}
                  <span className="text-sm font-normal text-gray-400">/ {allDevices.length}</span>
                </Title>
                <Text className="text-xs text-gray-400 mt-1 block">
                  Sẵn sàng nhận lệnh & xem màn hình
                </Text>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center">
                <WifiOutlined className="text-2xl text-green-400" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            className="bg-[#1f2028] border-orange-500/30 rounded-xl cursor-pointer hover:border-orange-500 transition-all"
            onClick={() => navigate('/alerts')}
          >
            <div className="flex items-center justify-between">
              <div>
                <Text className="text-orange-400 text-xs uppercase tracking-wider block mb-1">
                  Cảnh Báo / Vi Phạm App
                </Text>
                <Title level={2} className="!m-0 !text-orange-400">
                  {recentAlerts.length}
                </Title>
                <Text className="text-xs text-orange-300/80 mt-1 block">
                  {warningOrCriticalDevices.length} máy đang ở trạng thái Cảnh báo →
                </Text>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-500/15 flex items-center justify-center">
                <AlertOutlined className="text-2xl text-orange-400" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            className="bg-[#1f2028] border-purple-500/30 rounded-xl cursor-pointer hover:border-purple-500 transition-all"
            onClick={() => setIsScheduleModalVisible(true)}
          >
            <div className="flex items-center justify-between">
              <div>
                <Text className="text-purple-400 text-xs uppercase tracking-wider block mb-1">
                  Lớp Học Đang Live
                </Text>
                <Title level={2} className="!m-0 !text-purple-400">
                  {displayedSessions.length}
                </Title>
                <Text className="text-xs text-gray-400 mt-1 block">
                  {displayedScheduled.length} lớp sắp diễn ra • {classrooms.length} lớp học
                </Text>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center">
                <VideoCameraOutlined className="text-2xl text-purple-400" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Active & Scheduled Class Sessions */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4 border-b border-[#2e303a] pb-2">
          <Title level={4} className="!text-gray-200 !m-0 flex items-center gap-2">
            <VideoCameraOutlined className="text-green-400" />
            Phiên Lớp Học Đang Diễn Ra & Sắp Tới
          </Title>
          <Button
            size="small"
            type="link"
            onClick={() => navigate('/history')}
            className="text-purple-400"
          >
            Xem lịch sử buổi học →
          </Button>
        </div>

        {allSessionsToDisplay.length === 0 ? (
          <Empty
            description={
              <span className="text-gray-400">
                Hiện chưa có phiên lớp học nào đang mở. Bạn có thể bấm <b>"Bắt đầu / Lên lịch học"</b> hoặc giám sát trực tiếp các thiết bị học sinh ngay bên dưới!
              </span>
            }
            className="bg-[#16171d] py-8 rounded-xl border border-[#2e303a]"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allSessionsToDisplay.map((session: any) => (
              <Card
                key={session.id}
                className={`bg-[#1f2028] shadow-lg rounded-xl transition-colors border ${
                  session.status === 'ACTIVE'
                    ? 'border-green-500/40 hover:border-green-500'
                    : 'border-blue-500/30 hover:border-blue-500'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Title
                      level={4}
                      className={`!m-0 ${
                        session.status === 'ACTIVE' ? '!text-green-400' : '!text-blue-400'
                      }`}
                    >
                      {session.classroomName}
                    </Title>
                    <Text className="text-gray-400 text-xs">
                      {isSuperAdmin ? `Giáo viên: ${session.teacherName} | ` : ''}
                      {session.status === 'ACTIVE' ? 'Bắt đầu' : 'Dự kiến'}:{' '}
                      {session.status === 'ACTIVE'
                        ? new Date(session.startedAt).toLocaleTimeString()
                        : new Date(session.scheduledStartTime).toLocaleTimeString()}
                    </Text>
                  </div>
                  {session.status === 'ACTIVE' ? (
                    <Tag color="success" className="animate-pulse border-0">
                      ● Đang Live
                    </Tag>
                  ) : (
                    <Tag color="processing" className="border-0">
                      Sắp diễn ra
                    </Tag>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  {session.status === 'ACTIVE' ? (
                    <Button
                      type="primary"
                      icon={<VideoCameraOutlined />}
                      className="flex-1 bg-green-600 hover:bg-green-500 border-0"
                      onClick={() =>
                        navigate(
                          `/live-classes/${session.id}${
                            effectiveSchoolId ? `?schoolId=${effectiveSchoolId}` : ''
                          }`
                        )
                      }
                    >
                      Vào phòng giám sát lớp
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 border-0"
                      loading={activateScheduledMutation.isPending}
                      onClick={() => activateScheduledMutation.mutate(session.id)}
                    >
                      Bắt đầu ngay
                    </Button>
                  )}
                  <Popconfirm
                    title="Kết thúc/Hủy lớp học?"
                    description={
                      session.status === 'ACTIVE'
                        ? 'Bạn có chắc chắn muốn kết thúc lớp học này không?'
                        : 'Bạn có chắc chắn muốn hủy lịch lớp học này không?'
                    }
                    onConfirm={() => handleEndSession(session.id)}
                    okText="Đồng ý"
                    cancelText="Không"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      danger
                      icon={<StopOutlined />}
                      loading={endSessionMutation.isPending}
                    />
                  </Popconfirm>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* REAL-TIME STUDENT DEVICES SUPERVISION & CONTROL CENTER                */}
      {/* ===================================================================== */}
      <div className="mb-10 bg-[#16171d] p-6 rounded-2xl border border-[#2e303a] shadow-xl">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-5 pb-4 border-b border-[#2e303a]">
          <div>
            <Title level={4} className="!m-0 !text-white flex items-center gap-2">
              <MobileOutlined className="text-cyan-400" />
              Giám Sát & Điều Khiển Thiết Bị Học Sinh Trực Tiếp ({filteredDevices.length} máy)
            </Title>
            <Text className="text-gray-400 text-xs">
              Bấm <b>"Xem màn hình"</b> để xem trực tiếp màn hình học sinh hoặc bấm <b>"Chi tiết"</b> để vào trang điều khiển cụ thể của từng máy
            </Text>
          </div>

          <Space wrap>
            <Input
              placeholder="Tìm tên máy, mã thiết bị, lớp..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              className="w-60 bg-[#1f2028] border-[#2e303a] text-white"
            />
            <Select
              value={filterClassroomId}
              onChange={setFilterClassroomId}
              className="w-44"
              options={[
                { value: 'ALL', label: 'Tất cả lớp học' },
                { value: 'UNASSIGNED', label: 'Chưa gán lớp' },
                ...classrooms.map((c: any) => ({
                  value: c.id,
                  label: `${c.name} (${c.code})`,
                })),
              ]}
            />
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              className="w-44"
              options={[
                { value: 'ALL', label: 'Mọi trạng thái' },
                { value: 'ONLINE_ALL', label: 'Đang kết nối (Live)' },
                { value: 'ONLINE', label: 'An toàn (ONLINE)' },
                { value: 'WARNING', label: 'Cảnh báo (WARNING)' },
                { value: 'CRITICAL', label: 'Vi phạm (CRITICAL)' },
                { value: 'OFFLINE', label: 'Ngoại tuyến (OFFLINE)' },
              ]}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetchDevices()}
              className="bg-[#1f2028] text-gray-300 border-[#2e303a]"
            >
              Làm mới
            </Button>
          </Space>
        </div>

        {/* Bulk Control Bar */}
        <div className="bg-[#1f2028] p-3.5 rounded-xl border border-[#2e303a] flex flex-wrap gap-3 mb-6 items-center justify-between">
          <div className="flex items-center gap-2">
            <ThunderboltOutlined className="text-yellow-400 text-lg" />
            <Text className="text-gray-200 font-semibold text-sm">
              Lệnh Điều Khiển Hàng Loạt ({filteredDevices.filter((d) => isDeviceConnected(d.status)).length} máy đang Online):
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="primary"
              danger
              size="small"
              icon={<LockOutlined />}
              onClick={() =>
                handleBulkCommand('LOCK_SCREEN', {
                  message: 'Giáo viên đã khóa màn hình lớp học. Vui lòng tập trung!',
                })
              }
            >
              Khóa Tất Cả
            </Button>
            <Button
              size="small"
              className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white bg-transparent"
              icon={<UnlockOutlined />}
              onClick={() => handleBulkCommand('UNLOCK_DEVICE')}
            >
              Mở Khóa Tất Cả
            </Button>
            <Button
              size="small"
              className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white bg-transparent"
              icon={<AlertOutlined />}
              onClick={promptBulkMessage}
            >
              Gửi Thông Báo Lớp
            </Button>
            <Button
              size="small"
              className="border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white bg-transparent"
              icon={<BellOutlined />}
              onClick={() => handleBulkCommand('RING_ALARM')}
            >
              Phát Còi Cảnh Báo
            </Button>
            <Button
              size="small"
              className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white bg-transparent"
              icon={<ClearOutlined />}
              onClick={() => handleBulkCommand('CLEAR_RAM')}
            >
              Dọn RAM & Đóng App Nền
            </Button>
          </div>
        </div>

        {/* Student Devices Cards Grid */}
        {isDevicesLoading ? (
          <Spin size="large" className="block mx-auto my-12" />
        ) : filteredDevices.length === 0 ? (
          <Empty
            description={
              <span className="text-gray-400">
                Không tìm thấy thiết bị học sinh nào khớp với bộ lọc hiện tại
              </span>
            }
            className="py-12"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDevices.map((device) => {
              const isOnline = isDeviceConnected(device.status);
              const isWarning = device.status === 'WARNING' || device.status === 'CRITICAL';
              const battery = device.metrics?.batteryLevel ?? 0;
              const ram = device.metrics?.ramUsage ?? 0;
              const currentApp = device.liveCurrentApp;
              const currentAppName =
                currentApp?.appName || currentApp?.packageName || (isOnline ? 'Màn hình chính' : 'Ngoại tuyến');
              const currentPkg = currentApp?.packageName || '';

              return (
                <div
                  key={device.id}
                  className={`rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between ${
                    isWarning
                      ? 'bg-gradient-to-br from-[#2a1810] to-[#171214] border-orange-500/60 shadow-[0_0_20px_rgba(249,115,22,0.15)]'
                      : isOnline
                      ? 'bg-[#1f2028] border-green-500/40 hover:border-cyan-400/70 shadow-lg'
                      : 'bg-[#191a21] border-[#2e303a] opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* Top Row: Device Name, Status, Classroom */}
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div
                        className="cursor-pointer group flex-1 min-w-0"
                        onClick={() => navigate(`/devices/${device.id}`)}
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            status={
                              device.status === 'CRITICAL'
                                ? 'error'
                                : device.status === 'WARNING'
                                ? 'warning'
                                : isOnline
                                ? 'success'
                                : 'default'
                            }
                          />
                          <span className="font-bold text-white text-base truncate group-hover:text-cyan-400 transition-colors">
                            {device.deviceName}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 truncate mt-0.5">
                          {device.model || 'Android Device'} • ID: {device.deviceId}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <Tag
                          color={
                            device.status === 'CRITICAL'
                              ? 'error'
                              : device.status === 'WARNING'
                              ? 'warning'
                              : isOnline
                              ? 'success'
                              : 'default'
                          }
                          className="m-0 text-[11px] font-bold border-0"
                        >
                          {device.status === 'ONLINE'
                            ? 'ONLINE'
                            : device.status === 'WARNING'
                            ? 'CẢNH BÁO'
                            : device.status === 'CRITICAL'
                            ? 'VI PHẠM'
                            : 'OFFLINE'}
                        </Tag>
                        <Tag
                          color="purple"
                          className="m-0 text-[10px] cursor-pointer border-0"
                          onClick={() => {
                            setAssigningDevice(device);
                            setTargetAssignClassroomId(device.classroom?.id);
                            setIsAssignModalOpen(true);
                          }}
                        >
                          <SwapOutlined className="mr-1" />
                          {device.classroom?.name || 'Gán lớp'}
                        </Tag>
                      </div>
                    </div>

                    {/* Real-time Foreground App Box */}
                    <div
                      className={`p-2.5 rounded-xl mb-3 border ${
                        isWarning
                          ? 'bg-orange-950/40 border-orange-500/40'
                          : 'bg-[#14151c] border-[#2e303a]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span className="flex items-center gap-1">
                          <AppstoreOutlined className="text-cyan-400" /> Ứng dụng đang mở:
                        </span>
                        {isOnline && (
                          <span className="text-[10px] text-green-400 font-mono">● LIVE</span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-white truncate">
                        {currentAppName}
                      </div>
                      {currentPkg && (
                        <div className="text-[11px] text-gray-500 font-mono truncate">
                          {currentPkg}
                        </div>
                      )}
                    </div>

                    {/* Battery & RAM Metrics */}
                    <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                      <div className="bg-[#14151c] px-3 py-2 rounded-lg border border-[#2e303a]">
                        <div className="flex justify-between text-gray-400 mb-1">
                          <span>Pin</span>
                          <span className="text-gray-200 font-mono">{battery}%</span>
                        </div>
                        <Progress
                          percent={battery}
                          size="small"
                          showInfo={false}
                          strokeColor={battery < 20 ? '#ef4444' : '#22c55e'}
                          trailColor="#2e303a"
                        />
                      </div>
                      <div className="bg-[#14151c] px-3 py-2 rounded-lg border border-[#2e303a]">
                        <div className="flex justify-between text-gray-400 mb-1">
                          <span>RAM</span>
                          <span className="text-gray-200 font-mono">{ram}%</span>
                        </div>
                        <Progress
                          percent={ram}
                          size="small"
                          showInfo={false}
                          strokeColor={ram > 85 ? '#f97316' : '#3b82f6'}
                          trailColor="#2e303a"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Primary Action Buttons: Watch Live Screen & Go to Device Detail Page */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-[#2e303a]">
                    <div className="flex gap-2">
                      <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        disabled={!isOnline}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 border-0 font-medium"
                        onClick={() => handleOpenLiveStream(device)}
                      >
                        Xem Màn Hình
                      </Button>
                      <Button
                        icon={<DesktopOutlined />}
                        className="flex-1 bg-[#262834] text-white border-[#3a3d4e] hover:border-purple-400 hover:text-purple-300 font-medium"
                        onClick={() => navigate(`/devices/${device.id}`)}
                      >
                        Trang Chi Tiết
                      </Button>
                    </div>

                    {/* Quick Control Row */}
                    <div className="grid grid-cols-4 gap-1.5">
                      <Tooltip title="Khóa màn hình máy này">
                        <Button
                          size="small"
                          danger
                          disabled={!isOnline}
                          icon={<LockOutlined />}
                          onClick={() =>
                            handleSendCommand(device.id, 'LOCK_SCREEN', {
                              message: 'Thiết bị đã bị Giáo viên khóa!',
                            })
                          }
                        >
                          Khóa
                        </Button>
                      </Tooltip>
                      <Tooltip title="Mở khóa màn hình">
                        <Button
                          size="small"
                          disabled={!isOnline}
                          className="border-green-500/60 text-green-400 bg-transparent hover:bg-green-500 hover:text-white"
                          icon={<UnlockOutlined />}
                          onClick={() => handleSendCommand(device.id, 'UNLOCK_DEVICE')}
                        >
                          Mở
                        </Button>
                      </Tooltip>
                      <Tooltip title="Gửi lời nhắc lên màn hình">
                        <Button
                          size="small"
                          disabled={!isOnline}
                          className="border-blue-500/60 text-blue-400 bg-transparent hover:bg-blue-500 hover:text-white"
                          icon={<AlertOutlined />}
                          onClick={() => promptSingleMessage(device)}
                        >
                          Nhắc
                        </Button>
                      </Tooltip>
                      <Tooltip title="Phát còi báo động trên máy học sinh">
                        <Button
                          size="small"
                          disabled={!isOnline}
                          className="border-orange-500/60 text-orange-400 bg-transparent hover:bg-orange-500 hover:text-white"
                          icon={<BellOutlined />}
                          onClick={() => handleSendCommand(device.id, 'RING_ALARM')}
                        >
                          Còi
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* RECENT UNRESOLVED ALERTS PANEL                                        */}
      {/* ===================================================================== */}
      <div className="mb-10 bg-[#1f2028] p-6 rounded-2xl border border-[#2e303a]">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4 pb-3 border-b border-[#2e303a]">
          <Title level={4} className="!m-0 !text-white flex items-center gap-2">
            <AlertOutlined className="text-orange-400" />
            Cảnh Báo Vi Phạm Chưa Xử Lý ({recentAlerts.length})
          </Title>
          <Space>
            {recentAlerts.length > 0 && (
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                className="bg-green-600 hover:bg-green-500 border-0"
                onClick={handleResolveAllAlerts}
              >
                Xử lý tất cả
              </Button>
            )}
            <Button size="small" onClick={() => navigate('/alerts')}>
              Xem toàn bộ cảnh báo →
            </Button>
          </Space>
        </div>

        {isAlertsLoading ? (
          <Spin className="block mx-auto my-6" />
        ) : recentAlerts.length === 0 ? (
          <Empty
            description={
              <span className="text-gray-400">
                Tuyệt vời! Hiện không có cảnh báo vi phạm nào chưa xử lý.
              </span>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {recentAlerts.slice(0, 6).map((alert) => {
              const matchedDevice = allDevices.find((d) => d.id === alert.device?.id);
              return (
                <div
                  key={alert.id}
                  className="bg-[#16171d] p-4 rounded-xl border border-orange-500/30 flex flex-wrap justify-between items-center gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Tag color={alert.severity === 'CRITICAL' ? 'error' : 'warning'}>
                        {alert.severity}
                      </Tag>
                      <span className="font-bold text-white">{alert.title}</span>
                      <span className="text-xs text-gray-400">
                        • {new Date(alert.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 mt-1">{alert.description}</div>
                    {alert.device && (
                      <div className="text-xs text-cyan-400 mt-1">
                        Thiết bị: <b>{alert.device.deviceName}</b>
                      </div>
                    )}
                  </div>

                  <Space>
                    {matchedDevice && isDeviceConnected(matchedDevice.status) && (
                      <Button
                        size="small"
                        type="primary"
                        icon={<EyeOutlined />}
                        className="bg-cyan-600 hover:bg-cyan-500 border-0"
                        onClick={() => handleOpenLiveStream(matchedDevice)}
                      >
                        Xem màn hình
                      </Button>
                    )}
                    {alert.device?.id && (
                      <Button
                        size="small"
                        icon={<DesktopOutlined />}
                        onClick={() => navigate(`/devices/${alert.device?.id}`)}
                      >
                        Chi tiết máy
                      </Button>
                    )}
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleResolveAlert(alert.id)}
                    >
                      Đã xử lý
                    </Button>
                  </Space>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* LIVE SCREEN STREAMING MODAL FOR TEACHER                               */}
      {/* ===================================================================== */}
      <Modal
        open={!!streamingDevice}
        onCancel={handleCloseLiveStream}
        width={900}
        centered
        footer={null}
        title={
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-3">
              <VideoCameraOutlined className="text-cyan-400 text-lg" />
              <span className="text-white font-bold">
                Xem Màn Hình Trực Tiếp: {streamingDevice?.deviceName}
              </span>
              {screenFrame ? (
                <Tag color="success" className="animate-pulse m-0">
                  ● ĐANG PHÁT LIVE
                </Tag>
              ) : (
                <Tag color="warning" className="m-0">
                  Đang kết nối luồng hình ảnh...
                </Tag>
              )}
            </div>
            {streamingDevice && (
              <Button
                size="small"
                type="primary"
                icon={<ExpandOutlined />}
                onClick={() => {
                  const targetId = streamingDevice.id;
                  setStreamingDevice(null);
                  navigate(`/devices/${targetId}`);
                }}
              >
                Mở Trang Chi Tiết Thiết Bị
              </Button>
            )}
          </div>
        }
      >
        {streamingDevice && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3">
            {/* Left/Center: Live Phone Screen */}
            <div className="md:col-span-2 bg-[#0b0c10] rounded-2xl border border-[#2e303a] flex flex-col items-center justify-center p-4 min-h-[540px]">
              {screenFrame ? (
                <img
                  src={`data:image/jpeg;base64,${screenFrame}`}
                  alt="Live Student Screen"
                  className="max-h-[68vh] w-auto object-contain rounded-xl border border-cyan-500/40 shadow-[0_0_30px_rgba(0,212,255,0.2)]"
                />
              ) : (
                <div className="text-center p-6">
                  <Spin size="large" />
                  <p className="text-gray-300 mt-4 font-medium">
                    Đang chờ luồng hình ảnh từ thiết bị {streamingDevice.deviceName}...
                  </p>
                  <p className="text-xs text-gray-500 mt-2 max-w-md">
                    Nếu thiết bị lần đầu tiên phát màn hình sau khi mở máy, hộp thoại cấp quyền quay màn hình sẽ tự động bật trên điện thoại.
                  </p>
                  <Button
                    size="small"
                    className="mt-4"
                    icon={<ReloadOutlined />}
                    onClick={() =>
                      handleSendCommand(streamingDevice.id, 'START_STREAM', {}, false)
                    }
                  >
                    Gửi lại yêu cầu Xem màn hình
                  </Button>
                </div>
              )}
            </div>

            {/* Right: Instant Teacher Controls while watching live */}
            <div className="flex flex-col justify-between bg-[#16171d] p-4 rounded-2xl border border-[#2e303a]">
              <div>
                <Title level={5} className="!text-white !mt-0 mb-3">
                  Thông tin & Điều khiển nhanh
                </Title>
                <div className="text-xs text-gray-400 space-y-2 mb-4 bg-[#1f2028] p-3 rounded-xl border border-[#2e303a]">
                  <div>
                    Thiết bị: <b className="text-white">{streamingDevice.deviceName}</b>
                  </div>
                  <div>
                    Model: <b className="text-gray-200">{streamingDevice.model}</b>
                  </div>
                  <div>
                    Lớp học:{' '}
                    <b className="text-purple-400">
                      {streamingDevice.classroom?.name || 'Chưa gán lớp'}
                    </b>
                  </div>
                  <div>
                    App đang mở:{' '}
                    <b className="text-cyan-400">
                      {liveDevicesMap[streamingDevice.deviceId]?.currentApp?.appName ||
                        liveDevicesMap[streamingDevice.deviceId]?.currentApp?.packageName ||
                        'Màn hình chính'}
                    </b>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <Button
                    type="primary"
                    danger
                    block
                    icon={<LockOutlined />}
                    onClick={() =>
                      handleSendCommand(streamingDevice.id, 'LOCK_SCREEN', {
                        message: 'Giáo viên đã khóa màn hình thiết bị của bạn!',
                      })
                    }
                  >
                    Khóa Màn Hình Ngay
                  </Button>
                  <Button
                    block
                    className="border-green-500 text-green-400 bg-transparent hover:bg-green-500 hover:text-white"
                    icon={<UnlockOutlined />}
                    onClick={() => handleSendCommand(streamingDevice.id, 'UNLOCK_DEVICE')}
                  >
                    Mở Khóa Thiết Bị
                  </Button>
                  <Button
                    block
                    className="border-blue-500 text-blue-400 bg-transparent hover:bg-blue-500 hover:text-white"
                    icon={<AlertOutlined />}
                    onClick={() => promptSingleMessage(streamingDevice)}
                  >
                    Gửi Cảnh Báo Nhắc Nhở
                  </Button>
                  <Button
                    block
                    className="border-orange-500 text-orange-400 bg-transparent hover:bg-orange-500 hover:text-white"
                    icon={<BellOutlined />}
                    onClick={() => handleSendCommand(streamingDevice.id, 'RING_ALARM')}
                  >
                    Phát Còi Báo Động
                  </Button>
                  <Button
                    block
                    className="border-purple-500 text-purple-400 bg-transparent hover:bg-purple-500 hover:text-white"
                    icon={<ClearOutlined />}
                    onClick={() => handleSendCommand(streamingDevice.id, 'CLEAR_RAM')}
                  >
                    Dọn RAM & Đóng App Nền
                  </Button>
                </div>
              </div>

              <Button
                danger
                block
                icon={<StopOutlined />}
                className="mt-6"
                onClick={handleCloseLiveStream}
              >
                Dừng Xem Màn Hình
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Assign Device to Classroom Modal */}
      <Modal
        title={`Gán Lớp Học Cho Thiết Bị: ${assigningDevice?.deviceName || ''}`}
        open={isAssignModalOpen}
        onCancel={() => setIsAssignModalOpen(false)}
        onOk={handleAssignClassroom}
        okText="Lưu thay đổi"
        cancelText="Hủy"
      >
        <div className="py-4">
          <p className="text-gray-300 mb-2">Chọn lớp học cho thiết bị này:</p>
          <Select
            className="w-full"
            placeholder="-- Chọn lớp học --"
            allowClear
            value={targetAssignClassroomId}
            onChange={(val) => setTargetAssignClassroomId(val)}
            options={classrooms.map((c: any) => ({
              value: c.id,
              label: `${c.name} (${c.code})`,
            }))}
          />
        </div>
      </Modal>

      {/* Schedule Session Modal */}
      <Modal
        title="Bắt đầu hoặc Lên lịch lớp học"
        open={isScheduleModalVisible}
        onCancel={() => setIsScheduleModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsScheduleModalVisible(false)}>
            Hủy
          </Button>,
          <Button
            key="startNow"
            type="primary"
            icon={<PlayCircleOutlined />}
            className="bg-green-600 hover:bg-green-500 border-0"
            loading={startNowMutation.isPending}
            onClick={() => {
              if (!selectedClassroomId) {
                message.warning('Vui lòng chọn lớp học');
                return;
              }
              startNowMutation.mutate(selectedClassroomId);
            }}
          >
            Bắt đầu ngay
          </Button>,
          <Button
            key="submit"
            type="primary"
            className="bg-blue-600 hover:bg-blue-500"
            loading={scheduleSessionMutation.isPending}
            onClick={handleScheduleSession}
          >
            Xác nhận lịch
          </Button>,
        ]}
        className="dark-modal"
      >
        <div className="py-4 flex flex-col gap-4">
          <div>
            <p className="text-gray-300 mb-2">Chọn lớp học:</p>
            <Select
              className="w-full"
              placeholder="-- Chọn lớp học --"
              value={selectedClassroomId}
              onChange={setSelectedClassroomId}
              loading={isClassroomsLoading}
            >
              {classrooms?.map((cr: any) => (
                <Select.Option key={cr.id} value={cr.id}>
                  {cr.name} ({cr.code})
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <p className="text-gray-300 mb-2">Thời gian bắt đầu & kết thúc:</p>
            <DatePicker.RangePicker
              showTime
              className="w-full"
              value={scheduleDates}
              onChange={(dates) => setScheduleDates(dates as any)}
            />
          </div>
        </div>
      </Modal>

      {/* Timetable / Calendar */}
      <div className="mt-8 bg-[#1f2028] p-6 rounded-xl border border-[#2e303a]">
        <Title level={4} className="!text-gray-200 mb-6 pb-2 border-b border-[#2e303a]">
          Thời khóa biểu
        </Title>
        <div className="bg-[#16171d] rounded-lg p-2 overflow-x-auto">
          <Calendar cellRender={dateCellRender} className="min-w-[800px] text-gray-300" />
        </div>
      </div>

      {/* Classroom Management Drawer */}
      <Drawer
        title="Quản lý Danh sách Lớp học"
        placement="right"
        width={600}
        onClose={() => setIsClassroomDrawerVisible(false)}
        open={isClassroomDrawerVisible}
        className="dark-drawer"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingClassroom(null);
              classroomForm.resetFields();
              setIsClassroomModalVisible(true);
            }}
          >
            Thêm Lớp Mới
          </Button>
        }
      >
        <Table
          dataSource={classrooms}
          rowKey="id"
          loading={isClassroomsLoading}
          pagination={{ pageSize: 10 }}
          className="dark-table"
          columns={[
            { title: 'Mã lớp', dataIndex: 'code', key: 'code', width: 100 },
            { title: 'Tên lớp', dataIndex: 'name', key: 'name' },
            {
              title: 'Thao tác',
              key: 'actions',
              width: 150,
              render: (_, record: any) => (
                <Space>
                  <Button
                    type="text"
                    icon={<EditOutlined className="text-blue-400" />}
                    onClick={() => {
                      setEditingClassroom(record);
                      classroomForm.setFieldsValue(record);
                      setIsClassroomModalVisible(true);
                    }}
                  />
                  <Popconfirm
                    title="Xóa lớp học này?"
                    onConfirm={() => deleteClassroomMutation.mutate(record.id)}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Drawer>

      <Modal
        title={editingClassroom ? 'Sửa Lớp Học' : 'Thêm Lớp Học Mới'}
        open={isClassroomModalVisible}
        onCancel={() => setIsClassroomModalVisible(false)}
        onOk={() => classroomForm.submit()}
        confirmLoading={createClassroomMutation.isPending || updateClassroomMutation.isPending}
        className="dark-modal"
      >
        <Form
          form={classroomForm}
          layout="vertical"
          onFinish={handleSaveClassroom}
          className="mt-4"
        >
          <Form.Item name="code" label="Mã Lớp (VD: L01)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Tên Lớp (VD: Lớp 10A1)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeacherDashboard;
