import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  Button,
  Typography,
  Tag,
  Spin,
  Row,
  Col,
  Progress,
  Badge,
  Dropdown,
  message,
  Modal,
  Input,
  Tooltip,
  Switch,
} from 'antd';
import {
  ArrowLeftOutlined,
  DesktopOutlined,
  WifiOutlined,
  DisconnectOutlined,
  LockOutlined,
  UnlockOutlined,
  AlertOutlined,
  MoreOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  EyeOutlined,
  BellOutlined,
  ClearOutlined,
  VideoCameraOutlined,
  ExpandOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getActiveSessions } from '../../../services/classSessionService';
import { getDevices } from '../../../services/deviceService';
import type { DeviceDto } from '../../../services/deviceService';
import { useWebSocket } from '../../../hooks/useWebSocket';
import axiosInstance from '../../../config/axios';

const { Title, Text } = Typography;

const LiveClassesPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get('schoolId') || undefined;

  const [streamingDevice, setStreamingDevice] = useState<DeviceDto | null>(null);
  const [showAllSchoolDevices, setShowAllSchoolDevices] = useState<boolean>(false);

  const {
    isConnected: wsConnected,
    screenFrame,
    clearScreenFrame,
    liveDevicesMap,
  } = useWebSocket(streamingDevice?.deviceId);

  // Find the session
  const { data: activeSessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ['activeSessions', schoolId],
    queryFn: () => getActiveSessions(schoolId),
  });

  const session = activeSessions.find((s) => s.id === sessionId);

  // Fetch devices for this classroom (or all devices if toggled)
  const { data: devicesData, isLoading: isDevicesLoading } = useQuery({
    queryKey: ['devices', session?.classroomId, showAllSchoolDevices],
    queryFn: () =>
      getDevices({
        classroomId: showAllSchoolDevices ? undefined : session?.classroomId,
        size: 100,
      }),
    enabled: !!session?.classroomId,
    refetchInterval: 3000,
  });

  if (isSessionsLoading) return <Spin size="large" className="block mx-auto mt-20" />;
  if (!session)
    return (
      <div className="p-6 text-center">
        <Title level={3} className="text-white">
          Không tìm thấy lớp học
        </Title>
        <Text className="text-gray-400">
          Phiên học này có thể đã kết thúc hoặc không tồn tại.
        </Text>
        <div className="mt-4">
          <Button onClick={() => navigate(-1)} icon={<ArrowLeftOutlined />}>
            Quay lại
          </Button>
        </div>
      </div>
    );

  const isDeviceConnected = (status?: string) =>
    status === 'ONLINE' || status === 'WARNING' || status === 'CRITICAL';

  const rawDevices: DeviceDto[] =
    (Array.isArray(devicesData)
      ? devicesData
      : devicesData?.content || (devicesData as any)?.items) || [];

  const devices = rawDevices.map((d) => {
    const live = liveDevicesMap[d.deviceId];
    return {
      ...d,
      status: (live?.status as any) || d.status,
      metrics: live?.metrics ? { ...d.metrics, ...live.metrics } : d.metrics,
      liveCurrentApp: live?.currentApp || d.currentApp || d.metrics?.currentApp,
    };
  });

  const onlineCount = devices.filter((d) => isDeviceConnected(d.status)).length;
  const offlineCount = devices.length - onlineCount;
  const onlinePercentage =
    devices.length > 0 ? Math.round((onlineCount / devices.length) * 100) : 0;

  const handleSendCommand = async (
    deviceId: string,
    commandType: string,
    payloadData: any = {},
    silent = false
  ) => {
    try {
      await axiosInstance.post(`/devices/${deviceId}/commands`, {
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
    message.info(`Đang kết nối màn hình trực tiếp từ ${device.deviceName}...`);
  };

  const handleCloseLiveStream = async () => {
    if (streamingDevice) {
      await handleSendCommand(streamingDevice.id, 'STOP_STREAM', {}, true);
    }
    clearScreenFrame();
    setStreamingDevice(null);
  };

  const handleBulkCommand = (commandType: string, payloadData: any = {}) => {
    const onlineDevices = devices.filter((d) => isDeviceConnected(d.status));
    if (onlineDevices.length === 0) {
      message.warning('Không có thiết bị nào đang trực tuyến để nhận lệnh!');
      return;
    }
    onlineDevices.forEach((d) => {
      handleSendCommand(d.id, commandType, payloadData, true);
    });
    message.success(`Đã gửi lệnh ${commandType} tới ${onlineDevices.length} thiết bị.`);
  };

  const promptForAlert = (targetDevice?: DeviceDto) => {
    let msg = targetDevice
      ? `Giáo viên nhắc nhở ${targetDevice.deviceName}: Tập trung vào bài giảng!`
      : 'Giáo viên yêu cầu cả lớp tập trung vào bài giảng!';
    Modal.confirm({
      title: targetDevice ? `Gửi Cảnh Báo Tới ${targetDevice.deviceName}` : 'Gửi Thông Báo Lớp',
      content: (
        <Input.TextArea
          rows={3}
          defaultValue={msg}
          onChange={(e) => (msg = e.target.value)}
          className="mt-4"
        />
      ),
      okText: 'Gửi đi',
      cancelText: 'Hủy',
      onOk: () => {
        if (targetDevice) {
          handleSendCommand(targetDevice.id, 'SHOW_ALERT', { message: msg });
        } else {
          handleBulkCommand('SHOW_ALERT', { message: msg });
        }
      },
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/teacher')}
            className="text-gray-400 hover:text-white"
          />
          <div>
            <Title level={3} className="!m-0 !text-white flex items-center gap-3">
              Giám sát: {session.classroomName}
              <Tag color="success" className="animate-pulse">
                ● Live
              </Tag>
              <Tag color={wsConnected ? 'cyan' : 'error'} className="text-xs font-normal border-0">
                {wsConnected ? 'WS Connected' : 'WS Disconnected'}
              </Tag>
            </Title>
            <Text className="text-gray-400">
              Giáo viên: {session.teacherName} | Bắt đầu lúc:{' '}
              {new Date(session.startedAt || '').toLocaleTimeString()}
            </Text>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#1f2028] px-4 py-2 rounded-xl border border-[#2e303a]">
          <Text className="text-gray-300 text-xs">Hiển thị toàn bộ thiết bị trường:</Text>
          <Switch
            size="small"
            checked={showAllSchoolDevices}
            onChange={setShowAllSchoolDevices}
          />
        </div>
      </div>

      <Row gutter={[24, 24]} className="mb-6">
        <Col xs={24} md={8}>
          <Card className="bg-[#1f2028] border-[#2e303a] rounded-xl h-full">
            <div className="flex items-center justify-between">
              <div>
                <Text className="text-gray-400 block mb-1">Tổng thiết bị giám sát</Text>
                <Title level={2} className="!m-0 !text-white">
                  {devices.length}
                </Title>
              </div>
              <DesktopOutlined className="text-3xl text-blue-500 opacity-20" />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="bg-[#1f2028] border-green-500/30 rounded-xl h-full shadow-[0_0_15px_rgba(34,197,94,0.1)]">
            <div className="flex items-center justify-between">
              <div>
                <Text className="text-green-400 block mb-1">Đang hoạt động (Online)</Text>
                <Title level={2} className="!m-0 !text-green-400">
                  {onlineCount}
                </Title>
              </div>
              <WifiOutlined className="text-3xl text-green-500 opacity-20" />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="bg-[#1f2028] border-red-500/30 rounded-xl h-full">
            <div className="flex items-center justify-between">
              <div>
                <Text className="text-red-400 block mb-1">Mất kết nối (Offline)</Text>
                <Title level={2} className="!m-0 !text-red-400">
                  {offlineCount}
                </Title>
              </div>
              <DisconnectOutlined className="text-3xl text-red-500 opacity-20" />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Bulk Actions Toolbar */}
      <div className="bg-[#16171d] p-4 rounded-xl border border-[#2e303a] flex flex-wrap gap-4 mb-6 shadow-lg items-center justify-between">
        <div className="flex items-center gap-2">
          <ThunderboltOutlined className="text-yellow-400 text-xl" />
          <Text className="text-gray-200 font-bold">
            Thao Tác Hàng Loạt ({onlineCount} máy Online)
          </Text>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="primary"
            danger
            icon={<LockOutlined />}
            onClick={() =>
              handleBulkCommand('LOCK_SCREEN', {
                message: 'Giáo viên đã khóa tất cả thiết bị trong lớp!',
              })
            }
          >
            Khóa Tất Cả
          </Button>
          <Button
            className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white bg-transparent"
            icon={<UnlockOutlined />}
            onClick={() => handleBulkCommand('UNLOCK_DEVICE')}
          >
            Mở Khóa Tất Cả
          </Button>
          <Button
            type="primary"
            className="bg-blue-600 hover:bg-blue-500 border-0"
            icon={<AlertOutlined />}
            onClick={() => promptForAlert()}
          >
            Gửi Thông Báo Lớp
          </Button>
          <Button
            className="border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white bg-transparent"
            icon={<BellOutlined />}
            onClick={() => handleBulkCommand('RING_ALARM')}
          >
            Phát Còi Cảnh Báo
          </Button>
          <Button
            className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white bg-transparent"
            icon={<ClearOutlined />}
            onClick={() => handleBulkCommand('CLEAR_RAM')}
          >
            Dọn RAM Cả Lớp
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-[#16171d] rounded-xl border border-[#2e303a] p-6 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <Title level={4} className="!m-0 !text-gray-200">
            Bản đồ thiết bị học sinh ({devices.length} máy)
          </Title>
          <div className="w-48">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Tỷ lệ trực tuyến</span>
              <span>{onlinePercentage}%</span>
            </div>
            <Progress
              percent={onlinePercentage}
              size="small"
              status="active"
              strokeColor="#22c55e"
              trailColor="#2e303a"
              showInfo={false}
            />
          </div>
        </div>

        {isDevicesLoading ? (
          <Spin className="block mx-auto mt-20" />
        ) : devices.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <DesktopOutlined className="text-4xl mb-3 opacity-30" />
            <p className="mb-3">Lớp học này chưa có thiết bị nào được gán riêng.</p>
            <Button type="primary" onClick={() => setShowAllSchoolDevices(true)}>
              Hiển thị tất cả thiết bị học sinh trong trường
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {devices.map((device) => {
              const isOnline = isDeviceConnected(device.status);
              const isWarning = device.status === 'WARNING' || device.status === 'CRITICAL';
              const battery = device.metrics?.batteryLevel ?? 0;
              const currentApp = device.liveCurrentApp;
              const currentAppName =
                currentApp?.appName ||
                currentApp?.packageName ||
                (isOnline ? 'Màn hình chính' : 'Ngoại tuyến');

              const deviceMenu = {
                items: [
                  {
                    key: 'stream',
                    label: 'Xem màn hình trực tiếp (Live)',
                    icon: <EyeOutlined />,
                    disabled: !isOnline,
                    onClick: () => handleOpenLiveStream(device),
                  },
                  {
                    key: 'view',
                    label: 'Vào trang chi tiết thiết bị',
                    icon: <DesktopOutlined />,
                    onClick: () => navigate(`/devices/${device.id}`),
                  },
                  { type: 'divider' as const },
                  {
                    key: 'lock',
                    label: 'Khóa màn hình',
                    icon: <LockOutlined />,
                    disabled: !isOnline,
                    onClick: () =>
                      handleSendCommand(device.id, 'LOCK_SCREEN', {
                        message: 'Thiết bị bị khóa bởi Giáo viên',
                      }),
                  },
                  {
                    key: 'unlock',
                    label: 'Mở khóa',
                    icon: <UnlockOutlined />,
                    disabled: !isOnline,
                    onClick: () => handleSendCommand(device.id, 'UNLOCK_DEVICE'),
                  },
                  {
                    key: 'alert',
                    label: 'Gửi cảnh báo nhắc nhở',
                    icon: <AlertOutlined />,
                    disabled: !isOnline,
                    onClick: () => promptForAlert(device),
                  },
                  {
                    key: 'alarm',
                    label: 'Phát còi báo động',
                    icon: <BellOutlined />,
                    disabled: !isOnline,
                    onClick: () => handleSendCommand(device.id, 'RING_ALARM'),
                  },
                ],
              };

              return (
                <div
                  key={device.id}
                  className={`relative p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                    isWarning
                      ? 'bg-gradient-to-br from-[#2d1a12] to-[#1a1111] border-orange-500/70 shadow-[0_8px_20px_rgba(249,115,22,0.2)]'
                      : isOnline
                      ? 'bg-gradient-to-br from-[#1a2e22] to-[#0f1f17] border-green-500/50 shadow-[0_8px_20px_rgba(34,197,94,0.15)]'
                      : 'bg-gradient-to-br from-[#2a1a1a] to-[#1a1010] border-red-500/30 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <Dropdown menu={deviceMenu} trigger={['click']}>
                        <Button
                          type="text"
                          size="small"
                          icon={<MoreOutlined className="text-gray-300 text-lg" />}
                          className="hover:bg-white/10"
                        />
                      </Dropdown>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-300 font-mono">Pin {battery}%</span>
                        <Badge
                          status={isWarning ? 'warning' : isOnline ? 'success' : 'error'}
                          className={isOnline ? 'animate-pulse' : ''}
                        />
                      </div>
                    </div>

                    <div
                      className="flex flex-col items-center text-center gap-2 cursor-pointer"
                      onClick={() => navigate(`/devices/${device.id}`)}
                    >
                      <div
                        className={`p-3 rounded-full ${
                          isWarning
                            ? 'bg-orange-500/20'
                            : isOnline
                            ? 'bg-green-500/20'
                            : 'bg-red-500/20'
                        }`}
                      >
                        <DesktopOutlined
                          className={`text-3xl ${
                            isWarning
                              ? 'text-orange-400'
                              : isOnline
                              ? 'text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]'
                              : 'text-red-400'
                          }`}
                        />
                      </div>
                      <div className="w-full">
                        <div
                          className="font-bold text-white truncate hover:text-cyan-400 transition-colors"
                          title={device.deviceName}
                        >
                          {device.deviceName}
                        </div>
                        <div className="text-xs text-gray-400 truncate mt-0.5">
                          {device.model || 'Thiết bị học sinh'}
                        </div>
                      </div>
                    </div>

                    {/* Real-time Current App */}
                    <div className="mt-3 p-2 rounded-xl bg-black/30 border border-white/10 text-center">
                      <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                        <AppstoreOutlined className="text-cyan-400" /> Đang mở:
                      </div>
                      <div className="text-xs font-semibold text-cyan-300 truncate mt-0.5">
                        {currentAppName}
                      </div>
                    </div>
                  </div>

                  {/* Direct Action Buttons */}
                  <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
                    <div className="flex gap-1.5">
                      <Button
                        size="small"
                        type="primary"
                        disabled={!isOnline}
                        icon={<EyeOutlined />}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 border-0 text-xs"
                        onClick={() => handleOpenLiveStream(device)}
                      >
                        Xem màn hình
                      </Button>
                      <Button
                        size="small"
                        icon={<DesktopOutlined />}
                        className="flex-1 bg-white/10 text-white border-white/20 hover:border-purple-400 text-xs"
                        onClick={() => navigate(`/devices/${device.id}`)}
                      >
                        Chi tiết
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <Tooltip title="Khóa màn hình">
                        <Button
                          size="small"
                          danger
                          disabled={!isOnline}
                          icon={<LockOutlined />}
                          onClick={() =>
                            handleSendCommand(device.id, 'LOCK_SCREEN', {
                              message: 'Thiết bị bị khóa bởi Giáo viên!',
                            })
                          }
                        />
                      </Tooltip>
                      <Tooltip title="Mở khóa">
                        <Button
                          size="small"
                          disabled={!isOnline}
                          className="border-green-500/60 text-green-400 bg-transparent hover:bg-green-500 hover:text-white"
                          icon={<UnlockOutlined />}
                          onClick={() => handleSendCommand(device.id, 'UNLOCK_DEVICE')}
                        />
                      </Tooltip>
                      <Tooltip title="Gửi nhắc nhở">
                        <Button
                          size="small"
                          disabled={!isOnline}
                          className="border-blue-500/60 text-blue-400 bg-transparent hover:bg-blue-500 hover:text-white"
                          icon={<AlertOutlined />}
                          onClick={() => promptForAlert(device)}
                        />
                      </Tooltip>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Screen Stream Modal inside LiveClassesPage */}
      <Modal
        open={!!streamingDevice}
        onCancel={handleCloseLiveStream}
        width={880}
        centered
        footer={null}
        title={
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-3">
              <VideoCameraOutlined className="text-cyan-400 text-lg" />
              <span className="text-white font-bold">
                Màn Hình Trực Tiếp: {streamingDevice?.deviceName}
              </span>
              {screenFrame ? (
                <Tag color="success" className="animate-pulse m-0">
                  ● LIVE
                </Tag>
              ) : (
                <Tag color="warning" className="m-0">
                  Đang kết nối...
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
                Vào Trang Chi Tiết Thiết Bị
              </Button>
            )}
          </div>
        }
      >
        {streamingDevice && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3">
            <div className="md:col-span-2 bg-[#0b0c10] rounded-2xl border border-[#2e303a] flex flex-col items-center justify-center p-4 min-h-[520px]">
              {screenFrame ? (
                <img
                  src={`data:image/jpeg;base64,${screenFrame}`}
                  alt="Live Student Screen"
                  className="max-h-[65vh] w-auto object-contain rounded-xl border border-cyan-500/40"
                />
              ) : (
                <div className="text-center p-6">
                  <Spin size="large" />
                  <p className="text-gray-300 mt-4">
                    Đang chờ luồng hình ảnh từ {streamingDevice.deviceName}...
                  </p>
                  <Button
                    size="small"
                    className="mt-4"
                    icon={<ReloadOutlined />}
                    onClick={() =>
                      handleSendCommand(streamingDevice.id, 'START_STREAM', {}, false)
                    }
                  >
                    Thử kết nối lại
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between bg-[#16171d] p-4 rounded-2xl border border-[#2e303a]">
              <div className="flex flex-col gap-2.5">
                <Title level={5} className="!text-white !mt-0 mb-2">
                  Điều khiển tức thì
                </Title>
                <Button
                  type="primary"
                  danger
                  block
                  icon={<LockOutlined />}
                  onClick={() =>
                    handleSendCommand(streamingDevice.id, 'LOCK_SCREEN', {
                      message: 'Giáo viên đã khóa thiết bị của bạn!',
                    })
                  }
                >
                  Khóa Màn Hình
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
                  onClick={() => promptForAlert(streamingDevice)}
                >
                  Gửi Cảnh Báo
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
                  Dọn RAM
                </Button>
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
    </div>
  );
};

export default LiveClassesPage;
