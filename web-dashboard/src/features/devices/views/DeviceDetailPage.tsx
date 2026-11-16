import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Typography, Button, Tag, Divider, message, Spin, Modal, Input, Table } from 'antd';
import { LockOutlined, DeleteOutlined, AlertOutlined, MobileOutlined, SendOutlined, ClearOutlined, DatabaseOutlined, DashboardOutlined, HddOutlined, ThunderboltOutlined, WifiOutlined, CloudDownloadOutlined, QrcodeOutlined, HistoryOutlined } from '@ant-design/icons';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { LiveScreenViewer } from '../components/LiveScreenViewer';
import { QRCodeSVG } from 'qrcode.react';
import axiosInstance from '../../../config/axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDeviceById } from '../../../services/deviceService';

const { Title, Text } = Typography;

const DeviceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  
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

  const { data: commandHistory = [], isLoading: loadingCommands } = useQuery({
    queryKey: ['deviceCommands', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/devices/${id}/commands`);
      return res.data?.data || [];
    },
    enabled: !!id,
    refetchInterval: 15000,
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

  // Connect to WebSocket to receive real-time metrics & live screen frames for this specific device
  const { isConnected, metrics, deviceStatus, subscribeScreenFrame, clearScreenFrame, currentApp, commandAck } = useWebSocket(deviceInfo?.deviceId);

  useEffect(() => {
    if (commandAck) {
      queryClient.invalidateQueries({ queryKey: ['deviceCommands', id] });
    }
  }, [commandAck, id, queryClient]);

  const handleSendCommand = useCallback(async (commandType: string, payloadData: any = {}) => {
    try {
      await axiosInstance.post(`/devices/${id}/commands`, {
        commandType,
        payload: payloadData
      });
      if (commandType === 'STOP_STREAM') {
        clearScreenFrame();
      }
      message.success(`Đã gửi lệnh ${commandType} thành công!`);
      queryClient.invalidateQueries({ queryKey: ['deviceCommands', id] });
    } catch (error: any) {
      message.error(error?.response?.data?.message || `Không thể gửi lệnh ${commandType} tới thiết bị.`);
    }
  }, [id, clearScreenFrame, queryClient]);

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

  // Use real-time status & metrics if available, otherwise fallback to initial info
  const currentStatus = deviceStatus || deviceInfo?.status;
  const activeMetrics = metrics || initialMetrics || (deviceInfo as any)?.metrics;
  

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
              RAM: {activeMetrics?.ramUsedMb ?? activeMetrics?.ramUsageMb ?? 0} / {activeMetrics?.ramTotalMb ?? 0} MB
            </Tag>
            <Tag color="green" icon={<HddOutlined />} className="px-3 py-1 border border-green-500/30">
              Lưu trữ: {(activeMetrics?.storageUsedGb ?? (activeMetrics?.storageUsedMb ? activeMetrics.storageUsedMb / 1024 : 0)).toFixed(1)} / {(activeMetrics?.storageTotalGb ?? (activeMetrics?.storageTotalMb ? activeMetrics.storageTotalMb / 1024 : 0)).toFixed(1)} GB
            </Tag>
            <Tag color={(activeMetrics?.batteryLevel ?? 100) < 20 ? "error" : "gold"} icon={<ThunderboltOutlined />} className="px-3 py-1 border border-yellow-500/30">
                Pin: {activeMetrics?.batteryLevel ?? 0}% {(activeMetrics?.batteryCharging === true || activeMetrics?.batteryCharging === 'CHARGING') ? '(Đang sạc)' : ''}
            </Tag>
            <Tag color="blue" icon={<WifiOutlined />} className="px-3 py-1 border border-blue-500/30">
              WiFi: {activeMetrics?.wifiSsid || 'Không có'}
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
        {/* Left Column: Live Screen Stream & 3D Digital Twin */}
        <div className="lg:col-span-2 space-y-6">

          {/* Live Incident View (Tách riêng thành component độc lập & bỏ mô hình 3D để đạt độ mượt tối đa) */}
          <LiveScreenViewer
            isConnected={isConnected}
            subscribeScreenFrame={subscribeScreenFrame}
            currentApp={currentApp}
            initialCurrentApp={deviceInfo?.currentApp}
            deviceLabel={deviceInfo?.deviceName || deviceInfo?.model}
            onSendCommand={handleSendCommand}
          />
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

      {/* Lịch sử lệnh điều khiển thời gian thực (bên dưới) */}
      <Card
        className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg mt-6"
        title={
          <span className="text-[var(--color-primary)] font-bold flex items-center gap-2">
            <HistoryOutlined /> Lịch sử Lệnh Điều khiển Thiết bị (Real-time ACK)
          </span>
        }
      >
        <Table
          dataSource={commandHistory}
          rowKey="id"
          loading={loadingCommands}
          pagination={{ pageSize: 5 }}
          className="custom-dark-table"
          columns={[
            {
              title: 'Lệnh Điều khiển',
              dataIndex: 'commandType',
              key: 'commandType',
              render: (cmd: string) => <Tag color="purple" className="font-mono font-bold">{cmd}</Tag>,
            },
            {
              title: 'Tham số (Payload)',
              dataIndex: 'payload',
              key: 'payload',
              render: (p: any) => (
                <Text className="text-gray-400 font-mono text-xs">
                  {p && Object.keys(p).length > 0 ? JSON.stringify(p) : '---'}
                </Text>
              ),
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              key: 'status',
              render: (st: string) => {
                const color =
                  st === 'EXECUTED'
                    ? 'success'
                    : st === 'SENT' || st === 'ACKNOWLEDGED'
                    ? 'processing'
                    : st === 'FAILED'
                    ? 'error'
                    : 'warning';
                return <Tag color={color}>{st}</Tag>;
              },
            },
            {
              title: 'Thời gian gửi',
              dataIndex: 'createdAt',
              key: 'createdAt',
              render: (t: string) => <Text className="text-gray-400 text-xs">{t ? new Date(t).toLocaleString() : '---'}</Text>,
            },
            {
              title: 'Thời gian thực thi',
              dataIndex: 'executedAt',
              key: 'executedAt',
              render: (t: string) => <Text className="text-green-400 text-xs">{t ? new Date(t).toLocaleString() : 'Đang chờ...'}</Text>,
            },
          ]}
        />
      </Card>

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
