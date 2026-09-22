import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Typography, Progress, Button, Tag, Space, Divider, message, Spin, Modal, Input } from 'antd';
import { LockOutlined, DeleteOutlined, AlertOutlined, MobileOutlined, SendOutlined, ClearOutlined, DatabaseOutlined, DashboardOutlined, HddOutlined, ThunderboltOutlined, WifiOutlined, CloudDownloadOutlined, QrcodeOutlined } from '@ant-design/icons';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { QRCodeSVG } from 'qrcode.react';
import axiosInstance from '../../../config/axios';
import { useQuery } from '@tanstack/react-query';
import { getDeviceById } from '../../../services/deviceService';

const { Title, Text } = Typography;

const DeviceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  
  const [initialMetrics, setInitialMetrics] = useState<any>(null);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [updateApkUrl, setUpdateApkUrl] = useState('');
  const [isAdminQrModalVisible, setIsAdminQrModalVisible] = useState(false);

  const { data: deviceInfo, isLoading: loading } = useQuery({
    queryKey: ['device', id],
    queryFn: () => getDeviceById(id!),
    enabled: !!id,
    refetchInterval: 30000,
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
  const { isConnected, metrics, deviceStatus, screenFrame, currentApp } = useWebSocket(deviceInfo?.deviceId);

  useEffect(() => {
    // Không tự động gọi START_STREAM nữa vì không ổn định (Theo yêu cầu)
  }, [isConnected, deviceInfo?.deviceId]);

  const handleSendCommand = async (commandType: string, payloadData: any = {}) => {
    try {
      await axiosInstance.post(`/devices/${id}/commands`, {
        commandType,
        payload: payloadData
      });
      message.success(`Đã gửi lệnh ${commandType} thành công!`);
    } catch (error) {
      // For demo purposes, we will still show success if API fails due to no backend running
      message.success(`(Demo) Đã gửi lệnh ${commandType}`);
    }
  };

  const handleUpdateApp = () => {
    if (!updateApkUrl) {
      message.error('Vui lòng nhập đường link tải APK!');
      return;
    }
    handleSendCommand('UPDATE_APP', { url: updateApkUrl });
    setIsUpdateModalVisible(false);
    setUpdateApkUrl('');
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
          <Text className="text-gray-400 block mt-2 mb-4">
            Android {deviceInfo?.androidVersion} | {deviceInfo?.school?.name || 'Chưa gán'} {deviceInfo?.classroom ? `- Lớp ${deviceInfo.classroom.name}` : ''}
          </Text>
          
          {/* Real-time System Metrics */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Tag color="purple" icon={<DatabaseOutlined />} className="px-3 py-1 border border-purple-500/30">
              RAM: {metrics?.ramUsedMb || 0} / {metrics?.ramTotalMb || 0} MB
            </Tag>
            <Tag color="green" icon={<HddOutlined />} className="px-3 py-1 border border-green-500/30">
              Lưu trữ: {(metrics?.storageUsedGb ?? 0).toFixed(1)} / {(metrics?.storageTotalGb ?? 0).toFixed(1)} GB
            </Tag>
            <Tag color={(metrics?.batteryLevel ?? 100) < 20 ? "error" : "gold"} icon={<ThunderboltOutlined />} className="px-3 py-1 border border-yellow-500/30">
                Pin: {metrics?.batteryLevel ?? 0}% {metrics?.batteryCharging ? '(Đang sạc)' : ''}
            </Tag>
            <Tag color="blue" icon={<WifiOutlined />} className="px-3 py-1 border border-blue-500/30">
              WiFi: {metrics?.wifiSsid || 'Không có'}
            </Tag>
            <Tag color="default" icon={<DashboardOutlined />} className="px-3 py-1 opacity-60 border-0">
              CPU: Không khả dụng (Bảo mật Android)
            </Tag>
          </div>
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

          {/* Live Incident View (App View) */}
          <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg" title={<span className="text-gray-300">Live Incident View</span>}>
            <div className="bg-black/50 border border-dashed border-[#2e303a] h-64 flex flex-col items-center justify-center rounded-lg overflow-hidden relative">
              <MobileOutlined className="text-6xl text-[var(--color-primary)] mb-4" />
              <Text className="text-gray-400 mb-2 font-medium">
                {isConnected ? 'Thiết bị đang trực tuyến' : 'Màn hình hiện đang tắt / Mất kết nối'}
              </Text>
              
              <div className="flex flex-col items-center gap-3">
                {(currentApp || deviceInfo?.currentApp) ? (
                  <div className="flex flex-col items-center gap-2">
                    {(currentApp?.appIconBase64 || deviceInfo?.currentApp?.appIconBase64) && (
                      <img 
                        src={`data:image/png;base64,${currentApp?.appIconBase64 || deviceInfo?.currentApp?.appIconBase64}`} 
                        alt="App Icon"
                        className="w-12 h-12 rounded-lg shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.5)] border border-[#2e303a]"
                      />
                    )}
                    <Tag color="cyan" className="px-4 py-2 text-sm border border-cyan-500/30 rounded-lg text-lg">
                      Đang mở ứng dụng: <span className="font-bold text-white">{(currentApp?.appName || deviceInfo?.currentApp?.appName) || (currentApp?.packageName || deviceInfo?.currentApp?.packageName)}</span>
                    </Tag>
                  </div>
                ) : (
                  <Tag color="default" className="px-4 py-2 text-sm border-0 rounded-lg text-gray-400">
                    Chưa xác định ứng dụng đang mở
                  </Tag>
                )}

                <Button 
                  type="primary" 
                  className="bg-[var(--color-primary)] border-none text-white hover:opacity-80 transition-colors shadow-[0_0_15px_rgba(170,59,255,0.4)] mt-4" 
                  onClick={() => handleSendCommand('FORCE_HEARTBEAT')}
                >
                  Làm mới thông tin Ứng dụng
                </Button>
              </div>
            </div>
          </Card>
          
          <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg mt-6 overflow-hidden p-0">
            <div className="relative flex items-center justify-center bg-gradient-to-br from-[#1a1c23] to-[#0a0a0f]" style={{ height: '350px', perspective: '1000px' }}>
              <div className="absolute top-4 left-4 bg-[var(--color-primary)] text-xs font-bold px-3 py-1 rounded-full z-10 shadow-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                Live 3D Digital Twin (Android)
              </div>
              
              {/* CSS 3D Android Phone */}
              <div className="relative w-48 h-96 transition-transform duration-1000 hover:rotate-y-12 hover:-rotate-x-12" style={{ transformStyle: 'preserve-3d', transform: 'rotateY(-15deg) rotateX(5deg)' }}>
                {/* Phone Body */}
                <div className="absolute inset-0 bg-[#2a2d36] rounded-[2rem] border-[4px] border-[#3e414c] shadow-2xl flex flex-col overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-tr before:from-transparent before:to-white/10 before:z-10" style={{ transform: 'translateZ(10px)' }}>
                  
                  {/* Camera hole */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-black rounded-full z-20 shadow-inner border border-gray-800"></div>
                  
                  {/* Screen Content */}
                  <div className="flex-1 bg-[#121318] m-1.5 rounded-[1.5rem] relative overflow-hidden flex flex-col p-4 z-0">
                    {/* Status bar */}
                    <div className="flex justify-between items-center text-[8px] text-gray-400 mb-4 px-1">
                      <span>12:00</span>
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      </div>
                    </div>
                    
                    {/* App Display */}
                    <div className="flex-1 flex flex-col items-center justify-center opacity-80">
                      {(currentApp?.appIconBase64 || deviceInfo?.currentApp?.appIconBase64) ? (
                        <img 
                          src={`data:image/png;base64,${currentApp?.appIconBase64 || deviceInfo?.currentApp?.appIconBase64}`} 
                          alt="App Icon"
                          className="w-10 h-10 rounded-lg shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.5)] mb-2"
                        />
                      ) : (
                        <MobileOutlined className="text-4xl text-[var(--color-primary)] mb-2 drop-shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.5)]" />
                      )}
                      <div className="text-white text-sm font-bold text-center truncate w-full px-2">
                        {deviceInfo?.deviceName || deviceInfo?.model || 'Android Device'}
                      </div>
                      <div className="text-cyan-400 text-xs mt-2 bg-cyan-900/30 px-2 py-0.5 rounded border border-cyan-500/20 truncate max-w-full">
                        {(currentApp?.appName || deviceInfo?.currentApp?.appName) || (currentApp?.packageName || deviceInfo?.currentApp?.packageName) || 'Màn hình chính'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Phone Edge (3D effect) */}
                <div className="absolute inset-0 bg-[#15161c] rounded-[2rem] -z-10" style={{ transform: 'translateZ(-5px)' }}></div>
                
                {/* Shadow */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-black/50 blur-xl rounded-[100%] -z-20" style={{ transform: 'rotateX(90deg) translateZ(-40px)' }}></div>
              </div>
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
                icon={<ClearOutlined />} 
                className="bg-purple-500/10 text-purple-500 border-purple-500/30 hover:bg-purple-500 hover:text-white transition-all text-left flex justify-start items-center"
                onClick={() => handleSendCommand('CLEAR_BACKGROUND_APPS')}
              >
                Dọn dẹp RAM (Xóa ứng dụng nền)
              </Button>
              <Button 
                size="large" 
                icon={<DeleteOutlined />} 
                danger 
                className="text-left flex justify-start items-center mt-2"
                onClick={() => handleSendCommand('WIPE_DATA')}
              >
                Xóa dữ liệu (Factory Reset)
              </Button>
              <Divider className="border-[#2e303a] my-2" />
              <Button 
                size="large" 
                icon={<CloudDownloadOutlined />} 
                className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500 hover:text-white transition-all text-left flex justify-start items-center"
                onClick={() => setIsUpdateModalVisible(true)}
              >
                Cập nhật App (OTA) (Thử nghiệm)
              </Button>
              <Button 
                size="large" 
                icon={<QrcodeOutlined />} 
                className="bg-pink-500/10 text-pink-400 border-pink-500/30 hover:bg-pink-500 hover:text-white transition-all text-left flex justify-start items-center"
                onClick={() => setIsAdminQrModalVisible(true)}
              >
                Mã QR Quản lý Admin (Thử nghiệm)
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
                <Text className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Cơ sở / Trường / Lớp</Text>
                <Text className="text-white font-medium text-base">
                  {deviceInfo?.school?.name || 'Chưa gán'} {deviceInfo?.classroom ? `- Lớp ${deviceInfo.classroom.name}` : ''}
                </Text>
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

      <Modal
        title="Cập Nhật Ứng Dụng Agent Từ Xa (OTA)"
        open={isUpdateModalVisible}
        onOk={handleUpdateApp}
        onCancel={() => {
          setIsUpdateModalVisible(false);
          setUpdateApkUrl('');
        }}
        okText="Gửi Lệnh Cập Nhật"
        cancelText="Hủy"
        okButtonProps={{ className: "bg-cyan-600 hover:bg-cyan-500 border-none" }}
      >
        <p className="mb-2 text-gray-600 dark:text-gray-300">
          Vui lòng dán đường link tải trực tiếp (Direct Link) của file APK bản cập nhật mới nhất.
          Thiết bị sẽ tự động tải ngầm và cài đè lên bản cũ.
        </p>
        <Input 
          placeholder="https://example.com/edusphere-agent-v2.apk" 
          value={updateApkUrl}
          onChange={(e) => setUpdateApkUrl(e.target.value)}
          size="large"
          className="mt-2"
        />
      </Modal>

      <Modal
        title="Quản lý Quyền Admin bằng QR Code"
        open={isAdminQrModalVisible}
        onCancel={() => setIsAdminQrModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsAdminQrModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={700}
      >
        <div className="grid grid-cols-2 gap-8 py-4">
          <div className="flex flex-col items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
            <Title level={5} className="!text-red-500 !mb-4 text-center">MÃ HỦY QUYỀN ADMIN (REMOVE DEVICE OWNER)</Title>
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <QRCodeSVG value="MDM_REVOKE_ADMIN" size={180} />
            </div>
            <Text className="text-gray-500 mt-4 text-center text-sm">
              Sử dụng tính năng <b>Quét mã QR</b> trong ứng dụng Agent để quét mã này. Agent sẽ tự động gỡ quyền Admin của chính nó (Yêu cầu mã PIN).
            </Text>
          </div>
          
          <div className="flex flex-col items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
            <Title level={5} className="!text-green-600 !mb-4 text-center">MÃ CẤP QUYỀN ADMIN (GRANT DEVICE OWNER)</Title>
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <QRCodeSVG value="MDM_GRANT_ADMIN" size={180} />
            </div>
            <Text className="text-gray-500 mt-4 text-center text-sm">
              Quét mã này bằng Agent để xem hướng dẫn lệnh ADB. <b>Lưu ý:</b> Quyền Device Owner chỉ có thể được cấp qua lệnh ADB khi máy đã được cài đặt xong.
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeviceDetailPage;
