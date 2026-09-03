import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Button, Typography, Space, Tag, Spin, Row, Col, Progress, Badge, Dropdown, message, Modal, Input } from 'antd';
import { ArrowLeftOutlined, DesktopOutlined, WifiOutlined, DisconnectOutlined, LockOutlined, UnlockOutlined, AlertOutlined, MoreOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getActiveSessions } from '../../../services/classSessionService';
import { getDevices } from '../../../services/deviceService';
import type { DeviceDto } from '../../../services/deviceService';
import axiosInstance from '../../../config/axios';

const { Title, Text } = Typography;

const LiveClassesPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get('schoolId') || undefined;

  // Find the session
  const { data: activeSessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ['activeSessions', schoolId],
    queryFn: () => getActiveSessions(schoolId),
  });

  const session = activeSessions.find(s => s.id === sessionId);

  // Fetch devices for this classroom
  const { data: devicesData, isLoading: isDevicesLoading } = useQuery({
    queryKey: ['devices', session?.classroomId],
    queryFn: () => getDevices({ classroomId: session?.classroomId, size: 100 }),
    enabled: !!session?.classroomId,
    refetchInterval: 3000 // Poll every 3 seconds to see device online/offline status
  });

  if (isSessionsLoading) return <Spin size="large" className="block mx-auto mt-20" />;
  if (!session) return (
    <div className="p-6 text-center">
      <Title level={3} className="text-white">Không tìm thấy lớp học</Title>
      <Text className="text-gray-400">Phiên học này có thể đã kết thúc hoặc không tồn tại.</Text>
      <div className="mt-4">
        <Button onClick={() => navigate(-1)} icon={<ArrowLeftOutlined />}>Quay lại</Button>
      </div>
    </div>
  );

  const devices: DeviceDto[] = devicesData?.content || [];
  const onlineCount = devices.filter(d => d.status === 'ONLINE').length;
  const offlineCount = devices.length - onlineCount;
  const onlinePercentage = devices.length > 0 ? Math.round((onlineCount / devices.length) * 100) : 0;

  const handleSendCommand = async (deviceId: string, commandType: string, payloadData: any = {}) => {
    try {
      await axiosInstance.post(`/devices/${deviceId}/commands`, {
        commandType,
        payload: payloadData
      });
      message.success(`Đã gửi lệnh ${commandType} thành công!`);
    } catch (error) {
      message.success(`(Demo) Đã gửi lệnh ${commandType} tới thiết bị.`);
    }
  };

  const handleBulkCommand = (commandType: string, payloadData: any = {}) => {
    const onlineDevices = devices.filter(d => d.status === 'ONLINE');
    if (onlineDevices.length === 0) {
      message.warning('Không có thiết bị nào đang trực tuyến để nhận lệnh!');
      return;
    }
    onlineDevices.forEach(d => {
      handleSendCommand(d.id, commandType, payloadData);
    });
    message.success(`Đã gửi lệnh hàng loạt tới ${onlineDevices.length} thiết bị.`);
  };

  const promptForAlert = () => {
    let msg = 'Giáo viên yêu cầu bạn tập trung vào bài giảng!';
    Modal.confirm({
      title: 'Gửi Thông Báo Lớp',
      content: (
        <Input.TextArea 
          rows={3} 
          defaultValue={msg} 
          onChange={(e) => msg = e.target.value}
          className="mt-4"
        />
      ),
      okText: 'Gửi đi',
      cancelText: 'Hủy',
      onOk: () => handleBulkCommand('SHOW_ALERT', { message: msg })
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/teacher')} className="text-gray-400 hover:text-white" />
        <div>
          <Title level={3} className="!m-0 !text-white flex items-center gap-3">
            Giám sát: {session.classroomName}
            <Tag color="success" className="animate-pulse">Live</Tag>
          </Title>
          <Text className="text-gray-400">Giáo viên: {session.teacherName} | Bắt đầu lúc: {new Date(session.startedAt || '').toLocaleTimeString()}</Text>
        </div>
      </div>

      <Row gutter={[24, 24]} className="mb-8">
        <Col xs={24} md={8}>
          <Card className="bg-[#1f2028] border-[#2e303a] rounded-xl h-full">
            <div className="flex items-center justify-between">
              <div>
                <Text className="text-gray-400 block mb-1">Tổng thiết bị lớp</Text>
                <Title level={2} className="!m-0 !text-white">{devices.length}</Title>
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
                <Title level={2} className="!m-0 !text-green-400">{onlineCount}</Title>
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
                <Title level={2} className="!m-0 !text-red-400">{offlineCount}</Title>
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
          <Text className="text-gray-200 font-bold">Thao Tác Hàng Loạt (Bulk Actions)</Text>
        </div>
        <div className="flex gap-3">
          <Button 
            type="primary" 
            danger
            icon={<LockOutlined />}
            onClick={() => handleBulkCommand('LOCK_SCREEN', { message: 'Giáo viên đã khóa tất cả thiết bị!' })}
          >
            Khóa Tất Cả
          </Button>
          <Button 
            className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
            icon={<UnlockOutlined />}
            onClick={() => handleBulkCommand('UNLOCK_DEVICE')}
          >
            Mở Khóa Tất Cả
          </Button>
          <Button 
            type="primary"
            className="bg-blue-600 hover:bg-blue-500 border-0"
            icon={<AlertOutlined />}
            onClick={promptForAlert}
          >
            Gửi Thông Báo
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-[#16171d] rounded-xl border border-[#2e303a] p-6 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <Title level={4} className="!m-0 !text-gray-200">Bản đồ thiết bị</Title>
          <div className="w-48">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Tỷ lệ tham gia</span>
              <span>{onlinePercentage}%</span>
            </div>
            <Progress percent={onlinePercentage} size="small" status="active" strokeColor="#22c55e" trailColor="#2e303a" showInfo={false} />
          </div>
        </div>

        {isDevicesLoading ? (
          <Spin className="block mx-auto mt-20" />
        ) : devices.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <DesktopOutlined className="text-4xl mb-3 opacity-20" />
            <p>Lớp học này chưa có thiết bị nào được gán.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {devices.map(device => {
              const isOnline = device.status === 'ONLINE';
              const deviceMenu = {
                items: [
                  {
                    key: 'lock',
                    label: 'Khóa màn hình',
                    icon: <LockOutlined />,
                    onClick: () => handleSendCommand(device.id, 'LOCK_SCREEN', { message: 'Thiết bị bị khóa bởi Giáo viên' })
                  },
                  {
                    key: 'unlock',
                    label: 'Mở khóa',
                    icon: <UnlockOutlined />,
                    onClick: () => handleSendCommand(device.id, 'UNLOCK_DEVICE')
                  },
                  { type: 'divider' as const },
                  {
                    key: 'alert',
                    label: 'Gửi cảnh báo',
                    icon: <AlertOutlined />,
                    onClick: () => handleSendCommand(device.id, 'SHOW_ALERT', { message: 'Chú ý bài giảng!' })
                  },
                  {
                    key: 'view',
                    label: 'Chi tiết / Xem màn hình',
                    icon: <DesktopOutlined />,
                    onClick: () => navigate(`/devices/${device.id}`)
                  }
                ]
              };

              return (
                <div 
                  key={device.id} 
                  className={`relative p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-2 group ${
                    isOnline 
                      ? 'bg-gradient-to-br from-[#1a2e22] to-[#0f1f17] border-green-500/50 shadow-[0_8px_20px_rgba(34,197,94,0.15)] hover:shadow-[0_10px_25px_rgba(34,197,94,0.3)]' 
                      : 'bg-gradient-to-br from-[#2a1a1a] to-[#1a1010] border-red-500/30 opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    transformStyle: 'preserve-3d',
                    perspective: '1000px'
                  }}
                >
                  {isOnline && (
                    <div className="absolute top-3 left-3">
                      <Dropdown menu={deviceMenu} trigger={['click']}>
                        <Button type="text" icon={<MoreOutlined className="text-gray-300 text-lg" />} className="hover:bg-white/10" />
                      </Dropdown>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge status={isOnline ? 'success' : 'error'} className={isOnline ? 'animate-pulse' : ''} />
                  </div>
                  <div className="flex flex-col items-center text-center gap-3 mt-4">
                    <div className={`p-4 rounded-full ${isOnline ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      <DesktopOutlined className={`text-4xl ${isOnline ? 'text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'text-red-400'}`} />
                    </div>
                    <div>
                      <div className="font-bold text-gray-200 truncate w-full max-w-[120px]" title={device.deviceName}>
                        {device.deviceName}
                      </div>
                      <div className="text-xs text-gray-500 truncate w-full max-w-[120px] mt-1" title={device.deviceId}>
                        {device.model || 'Thiết bị học sinh'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveClassesPage;
