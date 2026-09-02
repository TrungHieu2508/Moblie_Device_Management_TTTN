import { Card, Col, Row, Statistic, Typography, Spin } from 'antd';
import { MobileOutlined, AlertOutlined, SafetyCertificateOutlined, WifiOutlined, LoadingOutlined } from '@ant-design/icons';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../../../services/dashboardService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const { Title, Text } = Typography;

const DashboardPage = () => {
  const { alertInfo } = useWebSocket();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: 'var(--color-primary)' }} spin />} />
      </div>
    );
  }

  // Calculate percentages safely
  const calculatePercent = (value: number, total: number) => {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 1000) / 10; // 1 decimal place
  };

  const totalDevices = summary?.totalDevices || 0;
  const onlinePercent = calculatePercent(summary?.onlineDevices || 0, totalDevices);
  const offlinePercent = calculatePercent(summary?.offlineDevices || 0, totalDevices);
  const warningPercent = calculatePercent(summary?.warningDevices || 0, totalDevices);
  const criticalPercent = calculatePercent(summary?.criticalDevices || 0, totalDevices);

  const violationData = [
    { name: 'T2', 'Khóa máy': 12, 'Chơi Game': 18 },
    { name: 'T3', 'Khóa máy': 19, 'Chơi Game': 23 },
    { name: 'T4', 'Khóa máy': 15, 'Chơi Game': 20 },
    { name: 'T5', 'Khóa máy': 22, 'Chơi Game': 35 },
    { name: 'T6', 'Khóa máy': 30, 'Chơi Game': 45 },
    { name: 'T7', 'Khóa máy': 10, 'Chơi Game': 15 },
    { name: 'CN', 'Khóa máy': 5, 'Chơi Game': 8 },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3} className="!m-0 !text-white">Tổng quan Hệ thống (Admin & IT District)</Title>
        <Text className="text-gray-400">Giám sát trạng thái hoạt động của toàn bộ thiết bị trong học khu/nhà trường</Text>
      </div>

      {/* Stats Cards */}
      <Row gutter={[24, 24]} className="mb-8">
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-gradient-to-br from-[#16171d] to-[#1f2028] border-[#2e303a] rounded-xl shadow-lg">
            <Statistic
              title={<span className="text-gray-400 font-medium">Tổng thiết bị</span>}
              value={totalDevices}
              prefix={<MobileOutlined className="text-[var(--color-primary)] mr-2" />}
              valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-gradient-to-br from-[#16171d] to-[#1f2028] border-[#2e303a] rounded-xl shadow-lg">
            <Statistic
              title={<span className="text-gray-400 font-medium">Đang hoạt động (Online)</span>}
              value={summary?.onlineDevices || 0}
              prefix={<WifiOutlined className="text-green-400 mr-2" />}
              valueStyle={{ color: '#4ade80', fontSize: '28px', fontWeight: 'bold' }}
              suffix={`/ ${totalDevices}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-gradient-to-br from-[#16171d] to-[#1f2028] border-[#2e303a] rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full"></div>
            <Statistic
              title={<span className="text-gray-400 font-medium">Cảnh báo chưa xử lý</span>}
              value={summary?.unresolvedAlerts || 0}
              prefix={<AlertOutlined className="text-red-400 mr-2 animate-pulse" />}
              valueStyle={{ color: '#f87171', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-gradient-to-br from-[#16171d] to-[#1f2028] border-[#2e303a] rounded-xl shadow-lg">
            <Statistic
              title={<span className="text-gray-400 font-medium">Chỉ số An toàn</span>}
              value={summary?.safetyIndex || 100}
              precision={1}
              suffix="%"
              prefix={<SafetyCertificateOutlined className="text-blue-400 mr-2" />}
              valueStyle={{ color: '#60a5fa', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Area */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card 
            title={<span className="text-gray-300">Biểu đồ Vi phạm 7 ngày qua (Demo)</span>} 
            className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg h-[450px]"
          >
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={violationData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e303a" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2028', border: '1px solid #2e303a', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Khóa máy" stroke="#ef4444" strokeWidth={3} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="Chơi Game" stroke="#eab308" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card 
            title={<span className="text-gray-300">Phân bố Trạng thái Thiết bị</span>} 
            className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg h-[400px]"
          >
            <div className="flex flex-col gap-6 mt-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <Text className="text-gray-400">Online</Text>
                  <Text className="text-green-400 font-bold">{onlinePercent}% ({summary?.onlineDevices || 0})</Text>
                </div>
                <div className="w-full bg-[#1f2028] rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${onlinePercent}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <Text className="text-gray-400">Offline</Text>
                  <Text className="text-gray-300 font-bold">{offlinePercent}% ({summary?.offlineDevices || 0})</Text>
                </div>
                <div className="w-full bg-[#1f2028] rounded-full h-2">
                  <div className="bg-gray-500 h-2 rounded-full" style={{ width: `${offlinePercent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <Text className="text-gray-400">Warning</Text>
                  <Text className="text-yellow-400 font-bold">{warningPercent}% ({summary?.warningDevices || 0})</Text>
                </div>
                <div className="w-full bg-[#1f2028] rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${warningPercent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <Text className="text-gray-400">Critical</Text>
                  <Text className="text-red-400 font-bold">{criticalPercent}% ({summary?.criticalDevices || 0})</Text>
                </div>
                <div className="w-full bg-[#1f2028] rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${criticalPercent}%` }}></div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
