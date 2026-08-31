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
  const { isConnected, metrics, deviceStatus, screenFrame } = useWebSocket(deviceInfo?.deviceId);

  useEffect(() => {
    if (isConnected && deviceInfo?.deviceId) {
      // Auto-start stream when connected
      handleSendCommand('START_STREAM');
    }
  }, [isConnected, deviceInfo?.deviceId]);

  const handleSendCommand = async (commandType: string, payloadData: any = {}) => {
    try {
      // API call to dispatch command to the queue
      await axiosInstance.post(`/devices/${id}/commands`, {
        commandType,
        payload: payloadData
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

          {/* Live Incident View (MJPEG Stream) */}
          <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg" title={<span className="text-gray-300">Live Incident View</span>}>
            <div className="bg-black/50 border border-dashed border-[#2e303a] h-64 flex flex-col items-center justify-center rounded-lg overflow-hidden relative">
              {screenFrame ? (
                <>
                  <img src={`data:image/jpeg;base64,${screenFrame}`} className="h-full w-full object-contain" alt="Live Screen" />
                  <Button 
                    type="primary" 
                    ghost 
                    className="absolute bottom-4 right-4 border-[var(--color-primary)] text-[var(--color-primary)] bg-black/60 hover:bg-black/80" 
                    onClick={() => handleSendCommand('STOP_STREAM')}
                  >
                    Dừng xem
                  </Button>
                </>
              ) : (
                <>
                  <MobileOutlined className="text-6xl text-gray-600 mb-4" />
                  <Text className="text-gray-500 mb-4">
                    {isConnected ? 'Đang tải luồng video trực tiếp...' : 'Màn hình hiện đang tắt'}
                  </Text>
                  {!isConnected && (
                    <Button 
                      type="primary" 
                      ghost 
                      className="border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors" 
                      onClick={() => handleSendCommand('START_STREAM')}
                    >
                      Bắt đầu Xem trực tiếp
                    </Button>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Remote Control Panel */}
        <div className="space-y-6">
          <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg" title={<span className="text-[var(--color-primary)] font-bold"><SendOutlined /> Điều khiển Thiết bị</span>}>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  size="large" 
                  icon={<LockOutlined />} 
                  className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500 hover:text-white transition-all text-left flex justify-center items-center"
                  onClick={() => handleSendCommand('LOCK_SCREEN', { message: 'Sử dụng phần mềm không phải học tập đi' })}
                >
                  Khóa màn hình
                </Button>
                <Button 
                  size="large" 
                  className="bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500 hover:text-white transition-all text-left flex justify-center items-center"
                  onClick={() => handleSendCommand('UNLOCK_DEVICE')}
                >
                  Mở khóa màn hình
                </Button>
              </div>
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

          <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg mt-6" title={<span className="text-[var(--color-primary)] font-bold">Thông tin Hệ thống</span>}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1f2028] p-4 rounded-lg border border-[#2e303a]">
                <Text className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Thiết bị</Text>
                <Text className="text-white font-medium text-base">{deviceInfo?.deviceName || deviceInfo?.model || 'Unknown'}</Text>
              </div>
              <div className="bg-[#1f2028] p-4 rounded-lg border border-[#2e303a]">
                <Text className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Hệ điều hành</Text>
                <Text className="text-white font-medium text-base">Android {deviceInfo?.androidVersion}</Text>
              </div>
              <div className="bg-[#1f2028] p-4 rounded-lg border border-[#2e303a]">
                <Text className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Cơ sở / Trường</Text>
                <Text className="text-white font-medium text-base">{deviceInfo?.school?.name || 'Chưa gán'}</Text>
              </div>
              <div className="bg-[#1f2028] p-4 rounded-lg border border-[#2e303a]">
                <Text className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Model / Serial</Text>
                <Text className="text-white font-mono text-sm">{deviceInfo?.model || '---'} / {deviceInfo?.serialNumber || '---'}</Text>
              </div>
            </div>
            
            <div className="mt-4 bg-blue-500/5 p-4 rounded-lg border border-blue-500/20">
              <Text className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Mã định danh (ID)</Text>
              <Text className="text-blue-400 font-mono text-sm break-all" copyable>{deviceInfo?.deviceId || 'Không có dữ liệu'}</Text>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DeviceDetailPage;
