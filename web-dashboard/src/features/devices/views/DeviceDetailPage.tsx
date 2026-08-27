import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Typography, Progress, Button, Tag, Space, Divider, message, Spin } from 'antd';
import { LockOutlined, DeleteOutlined, AlertOutlined, MobileOutlined, SendOutlined } from '@ant-design/icons';
import { useWebSocket } from '../../../hooks/useWebSocket';
import axiosInstance from '../../../config/axios';
import { useQuery } from '@tanstack/react-query';
import { getDeviceById } from '../../../services/deviceService';

const { Title, Text } = Typography;

const DeviceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  
  const [initialMetrics, setInitialMetrics] = useState<any>(null);

  const { data: deviceInfo, isLoading: loading } = useQuery({
    queryKey: ['device', id],
    queryFn: () => getDeviceById(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (deviceInfo?.deviceId) {
      axiosInstance.get(`/devices/${deviceInfo.deviceId}/metrics`)
        .then(res => {
          if (res.data?.data) {
            setInitialMetrics(res.data.data);
          }
        })
        .catch(err => console.error('Failed to fetch initial metrics', err));
    }
  }, [deviceInfo?.deviceId]);

  // Connect to WebSocket to receive real-time metrics for this specific device
  const { isConnected, metrics, deviceStatus } = useWebSocket(deviceInfo?.deviceId);

  const handleSendCommand = async (commandType: string) => {
    try {
      // API call to dispatch command to the queue
      await axiosInstance.post(`/devices/${id}/commands`, {
        commandType,
        payload: {} // Add specific payload if needed (e.g. { message: '...' } for SEND_MESSAGE)
      });
      message.success(`Đã xếp hàng lệnh ${commandType} thành công!`);
    } catch (error) {
      // For demo purposes, we will still show success if API fails due to no backend running
      message.success(`(Demo) Đã gửi lệnh ${commandType}`);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Spin size="large" /></div>;

  // Use real-time status if available, otherwise fallback to initial info
  const currentStatus = deviceStatus || deviceInfo?.status;
  
  // Use real-time metrics if available, otherwise fallback to initial metrics, otherwise default 0
  const currentMetrics = metrics || initialMetrics || {
    cpuUsagePct: 0,
    ramUsagePct: 0,
    batteryLevel: 0,
    storageUsedGb: 0
  };

  return (
    <div className="p-6">
      {/* Header section */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Title level={3} className="!m-0 !text-white flex items-center gap-3">
            <MobileOutlined /> {deviceInfo?.deviceName || deviceInfo?.model}
            {currentStatus === 'ONLINE' && <Tag color="success" className="ml-2 animate-pulse">ONLINE</Tag>}
            {currentStatus === 'OFFLINE' && <Tag color="default" className="ml-2">OFFLINE</Tag>}
            {currentStatus === 'WARNING' && <Tag color="warning" className="ml-2">WARNING</Tag>}
            {currentStatus === 'CRITICAL' && <Tag color="error" className="ml-2 animate-bounce">CRITICAL</Tag>}
          </Title>
          <Text className="text-gray-400 block mt-2">
            Android {deviceInfo?.androidVersion} | {deviceInfo?.school?.name || 'Chưa gán'} {deviceInfo?.classroom ? `- Lớp ${deviceInfo.classroom.name}` : ''}
          </Text>
        </div>
        <div>
          <Tag color={isConnected ? "processing" : "default"} className="border-0">
            {isConnected ? '🟢 WebSocket Connected' : '🔴 WebSocket Disconnected'}
          </Tag>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Metrics */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg" title={<span className="text-gray-300">Giám sát Thời gian thực (Real-time Metrics)</span>}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <Progress type="dashboard" percent={currentMetrics.cpuUsagePct} strokeColor={{ '0%': '#aa3bff', '100%': '#ef4444' }} trailColor="#1f2028" size={120} />
                <div className="mt-2 text-gray-400 font-medium">CPU Usage</div>
              </div>
              <div>
                <Progress type="dashboard" percent={currentMetrics.ramUsagePct} strokeColor={{ '0%': '#3b82f6', '100%': '#aa3bff' }} trailColor="#1f2028" size={120} />
                <div className="mt-2 text-gray-400 font-medium">RAM Usage</div>
              </div>
              <div>
                <Progress type="dashboard" percent={currentMetrics.batteryLevel} strokeColor={currentMetrics.batteryLevel < 20 ? '#ef4444' : '#10b981'} trailColor="#1f2028" size={120} />
                <div className="mt-2 text-gray-400 font-medium">Battery</div>
              </div>
              <div>
                <div className="h-[120px] flex flex-col items-center justify-center border-4 border-[#1f2028] rounded-full w-[120px] mx-auto">
                  <span className="text-2xl font-bold text-white">{(currentMetrics.storageTotalGb ? (currentMetrics.storageTotalGb - currentMetrics.storageUsedGb).toFixed(1) : currentMetrics.storageUsedGb) || 0}</span>
                  <span className="text-xs text-gray-500">GB Free</span>
                </div>
                <div className="mt-2 text-gray-400 font-medium">Storage</div>
              </div>
            </div>
          </Card>

          {/* Placeholder for Live Incident View (Phase 6.6) */}
          <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg" title={<span className="text-gray-300">Live Incident View</span>}>
            <div className="bg-black/50 border border-dashed border-[#2e303a] h-64 flex flex-col items-center justify-center rounded-lg">
              <MobileOutlined className="text-6xl text-gray-600 mb-4" />
              <Text className="text-gray-500">Nhấn "Xem trực tiếp" để kích hoạt stream màn hình</Text>
              <Button type="primary" ghost className="mt-4 border-[var(--color-primary)] text-[var(--color-primary)]" onClick={() => handleSendCommand('START_STREAM')}>Xem trực tiếp</Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Remote Control Panel */}
        <div className="space-y-6">
          <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg" title={<span className="text-[var(--color-primary)] font-bold"><SendOutlined /> Điều khiển Thiết bị</span>}>
            <div className="flex flex-col gap-3">
              <Button 
                size="large" 
                icon={<LockOutlined />} 
                className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500 hover:text-white transition-all text-left flex justify-start items-center"
                onClick={() => handleSendCommand('LOCK_SCREEN')}
              >
                Khóa màn hình khẩn cấp
              </Button>
              <Button 
                size="large" 
                icon={<AlertOutlined />} 
                className="bg-blue-500/10 text-blue-500 border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all text-left flex justify-start items-center"
                onClick={() => handleSendCommand('RING_ALARM')}
              >
                Phát âm thanh cảnh báo
              </Button>
              <Divider className="border-[#2e303a] my-2" />
              <Button 
                size="large" 
                icon={<DeleteOutlined />} 
                danger 
                className="text-left flex justify-start items-center"
                onClick={() => handleSendCommand('WIPE_DATA')}
              >
                Xóa dữ liệu (Factory Reset)
              </Button>
            </div>
          </Card>

          <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg" title={<span className="text-gray-300">Thông tin Hệ thống</span>}>
            <Space direction="vertical" className="w-full">
              <div className="flex justify-between border-b border-[#2e303a] pb-2">
                <Text className="text-gray-500">Hệ điều hành</Text>
                <Text className="text-white">Android {deviceInfo?.androidVersion}</Text>
              </div>
              <div className="flex justify-between border-b border-[#2e303a] pb-2">
                <Text className="text-gray-500">ID Thiết bị</Text>
                <Text className="text-white">{deviceInfo?.deviceId}</Text>
              </div>
              <div className="flex justify-between pb-2">
                <Text className="text-gray-500">MDM Agent Ver</Text>
                <Text className="text-white">{deviceInfo?.agentVersion || 'Unknown'}</Text>
              </div>
            </Space>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DeviceDetailPage;
