import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Button, Typography, Space, Tag, Spin, Row, Col, Progress, Badge } from 'antd';
import { ArrowLeftOutlined, DesktopOutlined, WifiOutlined, DisconnectOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getActiveSessions } from '../../../services/classSessionService';
import { getDevices } from '../../../services/deviceService';
import type { DeviceDto } from '../../../services/deviceService';

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

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/teacher')} className="text-gray-400 hover:text-white" />
        <div>
          <Title level={3} className="!m-0 !text-white flex items-center gap-3">
            Giám sát: {session.classroomName}
            <Tag color="success" className="animate-pulse">Live</Tag>
          </Title>
          <Text className="text-gray-400">Giáo viên: {session.teacherName} | Bắt đầu lúc: {new Date(session.startedAt).toLocaleTimeString()}</Text>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {devices.map(device => {
              const isOnline = device.status === 'ONLINE';
              return (
                <div 
                  key={device.id} 
                  className={`relative p-4 rounded-xl border transition-all ${
                    isOnline 
                      ? 'bg-[#1a2e22] border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.15)]' 
                      : 'bg-[#2a1a1a] border-red-500/30 opacity-70'
                  }`}
                >
                  <div className="absolute top-3 right-3">
                    <Badge status={isOnline ? 'success' : 'error'} className={isOnline ? 'animate-pulse' : ''} />
                  </div>
                  <div className="flex flex-col items-center text-center gap-2">
                    <DesktopOutlined className={`text-4xl ${isOnline ? 'text-green-400' : 'text-red-400'}`} />
                    <div>
                      <div className="font-semibold text-gray-200 truncate w-full max-w-[100px]" title={device.deviceName}>
                        {device.deviceName}
                      </div>
                      <div className="text-xs text-gray-500 truncate w-full max-w-[100px]" title={device.deviceId}>
                        {device.deviceId.substring(0, 8)}...
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
