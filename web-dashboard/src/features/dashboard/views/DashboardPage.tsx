import { useRef, useEffect } from 'react';
import { Typography, Spin, Button, Tag } from 'antd';
import {
  MobileOutlined,
  AlertOutlined,
  SafetyCertificateOutlined,
  WifiOutlined,
  LoadingOutlined,
  ThunderboltOutlined,
  QrcodeOutlined,
  BankOutlined,
  BookOutlined,
  UserOutlined,
  GlobalOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDashboardSummary } from '../../../services/dashboardService';
import { getDevices } from '../../../services/deviceService';
import { getAlerts, updateAlertStatus } from '../../../services/alertService';
import { useAuthStore } from '../../../store/authStore';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const { Title, Text } = Typography;

// Animated number counter
const CountUp = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = 0;
    const duration = 900;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + (value - start) * eased) + suffix;
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, suffix]);
  return <span ref={ref}>0{suffix}</span>;
};

// Stat card with 3D tilt & click navigation
const StatCard = ({ title, subtitle, value, suffix, icon, color, glowColor, gradient, delay = 0, onClick }: any) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
    card.style.boxShadow = `0 16px 40px ${glowColor}28, 0 0 24px ${glowColor}14`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
    card.style.boxShadow = `0 4px 20px rgba(0,0,0,0.3)`;
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="stat-count-up rounded-2xl p-5 cursor-pointer relative overflow-hidden"
      style={{
        background: gradient,
        border: `1px solid ${glowColor}28`,
        transition: 'transform 0.15s ease, box-shadow 0.3s ease',
        boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
        animationDelay: `${delay}ms`,
        transformStyle: 'preserve-3d',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${glowColor}20`, border: `1px solid ${glowColor}30` }}
        >
          <span style={{ color: glowColor, fontSize: 18 }}>{icon}</span>
        </div>
        <div
          className="text-[10px] font-mono-data px-2 py-0.5 rounded-lg flex items-center gap-1"
          style={{ background: `${glowColor}12`, color: glowColor, border: `1px solid ${glowColor}20` }}
        >
          MỞ <ArrowRightOutlined style={{ fontSize: 9 }} />
        </div>
      </div>
      <div className="font-bold text-3xl mb-1" style={{ color: color, fontFamily: "'JetBrains Mono', monospace" }}>
        <CountUp value={value} suffix={suffix} />
      </div>
      <div className="text-sm font-semibold text-white">{title}</div>
      {subtitle && (
        <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
          {subtitle}
        </div>
      )}
      <div
        className="absolute top-0 left-0 w-full h-px rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${glowColor}60, transparent)` }}
      />
    </div>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const role = user?.role;
  const { lastEvent, alertInfo } = useWebSocket();

  useEffect(() => {
    if (lastEvent || alertInfo) {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_online_devices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_recent_alerts'] });
    }
  }, [lastEvent, alertInfo, queryClient]);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
    refetchInterval: 30000,
  });

  const { data: devicesData } = useQuery({
    queryKey: ['dashboard_online_devices'],
    queryFn: () => getDevices({ page: 0, size: 12 }),
    refetchInterval: 20000,
  });
  const devices = (Array.isArray(devicesData) ? devicesData : devicesData?.content) || [];

  const { data: alertsData } = useQuery({
    queryKey: ['dashboard_recent_alerts'],
    queryFn: () => getAlerts({ page: 0, size: 6 }),
    refetchInterval: 20000,
  });
  const recentAlerts = (Array.isArray(alertsData) ? alertsData : alertsData?.items || alertsData?.content) || [];

  const resolveAlertMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateAlertStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard_recent_alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#aa3bff' }} spin />} />
        <div className="font-mono-data text-sm" style={{ color: '#6b7280' }}>
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  const calculatePercent = (value: number, total: number) => {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 1000) / 10;
  };

  const totalDevices = summary?.totalDevices || 0;
  const onlinePercent = calculatePercent(summary?.onlineDevices || 0, totalDevices);
  const offlinePercent = calculatePercent(summary?.offlineDevices || 0, totalDevices);
  const warningPercent = calculatePercent(summary?.warningDevices || 0, totalDevices);
  const criticalPercent = calculatePercent(summary?.criticalDevices || 0, totalDevices);

  const violationData =
    summary?.violationData?.map((item: any) => ({
      name: item.name,
      'Khóa máy': item.locked,
      'Chơi Game': item.gaming,
    })) || [
      { name: 'T2', 'Khóa máy': 0, 'Chơi Game': 0 },
      { name: 'T3', 'Khóa máy': 0, 'Chơi Game': 0 },
      { name: 'T4', 'Khóa máy': 0, 'Chơi Game': 0 },
      { name: 'T5', 'Khóa máy': 0, 'Chơi Game': 0 },
      { name: 'T6', 'Khóa máy': 0, 'Chơi Game': 0 },
      { name: 'T7', 'Khóa máy': 0, 'Chơi Game': 0 },
      { name: 'CN', 'Khóa máy': 0, 'Chơi Game': 0 },
    ];

  const statCards = [
    {
      title: 'Tổng thiết bị',
      subtitle: 'Quản lý danh sách thiết bị',
      value: totalDevices,
      icon: <MobileOutlined />,
      color: '#e2d4ff',
      glowColor: '#aa3bff',
      gradient: 'linear-gradient(135deg, rgba(170,59,255,0.14), rgba(170,59,255,0.04))',
      onClick: () => navigate('/devices'),
    },
    {
      title: 'Đang Online',
      subtitle: 'Giám sát & Điều khiển Thiết bị',
      value: summary?.onlineDevices || 0,
      icon: <WifiOutlined />,
      color: '#4ade80',
      glowColor: '#22c55e',
      gradient: 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(34,197,94,0.04))',
      onClick: () => navigate('/devices'),
    },
    {
      title: 'Cảnh báo chưa xử lý',
      subtitle: 'Xem & xử lý vi phạm ngay',
      value: summary?.unresolvedAlerts || 0,
      icon: <AlertOutlined />,
      color: '#f87171',
      glowColor: '#ef4444',
      gradient: 'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(239,68,68,0.04))',
      onClick: () => navigate('/alerts'),
    },
    {
      title: 'Chỉ số An toàn',
      subtitle: 'Trực quan hóa trên Bản đồ 3D',
      value: summary?.safetyIndex ?? 100,
      suffix: '%',
      icon: <SafetyCertificateOutlined />,
      color: '#60a5fa',
      glowColor: '#3b82f6',
      gradient: 'linear-gradient(135deg, rgba(59,130,246,0.14), rgba(59,130,246,0.04))',
      onClick: () => navigate('/map3d'),
    },
  ];

  const statusBars = [
    { label: 'Online', percent: onlinePercent, count: summary?.onlineDevices || 0, color: '#22c55e', glow: 'rgba(34,197,94,0.5)' },
    { label: 'Offline', percent: offlinePercent, count: summary?.offlineDevices || 0, color: '#64748b', glow: 'rgba(100,116,139,0.4)' },
    { label: 'Warning', percent: warningPercent, count: summary?.warningDevices || 0, color: '#eab308', glow: 'rgba(234,179,8,0.5)' },
    { label: 'Critical', percent: criticalPercent, count: summary?.criticalDevices || 0, color: '#ef4444', glow: 'rgba(239,68,68,0.5)' },
  ];

  const quickActions = [
    {
      label: 'Thiết bị & Điều khiển',
      icon: <MobileOutlined />,
      path: '/devices',
      color: '#00d4ff',
      bg: 'rgba(0,212,255,0.12)',
      border: 'rgba(0,212,255,0.35)',
    },
    {
      label: 'Tạo Mã QR Ghi Danh',
      icon: <QrcodeOutlined />,
      path: '/enrollments',
      color: '#4ade80',
      bg: 'rgba(34,197,94,0.12)',
      border: 'rgba(34,197,94,0.35)',
    },
    {
      label: 'Quản lý Trường học',
      icon: <BankOutlined />,
      path: '/schools',
      color: '#34d399',
      bg: 'rgba(16,185,129,0.12)',
      border: 'rgba(16,185,129,0.35)',
    },
    {
      label: 'Quản lý Lớp học',
      icon: <BookOutlined />,
      path: '/classrooms',
      color: '#fbbf24',
      bg: 'rgba(245,158,11,0.12)',
      border: 'rgba(245,158,11,0.35)',
    },
    ...(role === 'SUPER_ADMIN'
      ? [
          {
            label: 'Quản lý Tài khoản',
            icon: <UserOutlined />,
            path: '/users',
            color: '#60a5fa',
            bg: 'rgba(59,130,246,0.12)',
            border: 'rgba(59,130,246,0.35)',
          },
        ]
      : []),
    {
      label: 'Bản Đồ 3D Học Khu',
      icon: <GlobalOutlined />,
      path: '/map3d',
      color: '#38bdf8',
      bg: 'rgba(56,189,248,0.12)',
      border: 'rgba(56,189,248,0.35)',
    },
  ];

  return (
    <div className="p-6" style={{ background: '#050507' }}>
      {/* Page Header + Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(170,59,255,0.3), rgba(0,212,255,0.2))',
                border: '1px solid rgba(170,59,255,0.3)',
              }}
            >
              <ThunderboltOutlined style={{ color: '#aa3bff', fontSize: 16 }} />
            </div>
            <Title level={3} className="!m-0 !text-white" style={{ letterSpacing: '-0.02em' }}>
              Trung tâm Điều hành Quản trị
            </Title>
            <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30">
              <div className="live-dot" />
              <span className="font-mono-data text-[11px] font-semibold" style={{ color: '#4ade80' }}>
                REAL-TIME
              </span>
            </div>
          </div>
          <Text style={{ color: '#9ca3af', fontSize: 13 }}>
            Giám sát trạng thái hoạt động toàn bộ cơ sở, trường học, lớp học và thiết bị học sinh
          </Text>
        </div>

        {/* Quick Navigation Bar */}
        <div className="flex flex-wrap gap-2">
          {quickActions.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: item.bg,
                border: `1px solid ${item.border}`,
                color: item.color,
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards — Clickable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {statCards.map((card, i) => (
          <div key={card.title} className="relative">
            <StatCard {...card} delay={i * 80} />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Line Chart */}
        <div
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: 'rgba(14,15,21,0.88)', border: '1px solid rgba(46,48,58,0.6)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-white font-semibold text-base">Biểu đồ Vi phạm & Khoá máy</div>
              <div className="font-mono-data text-xs mt-0.5" style={{ color: '#6b7280' }}>
                Thống kê 7 ngày gần nhất
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.6)' }} />
                <span style={{ color: '#9ca3af' }}>Khóa máy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#eab308', boxShadow: '0 0 6px rgba(234,179,8,0.6)' }} />
                <span style={{ color: '#9ca3af' }}>Mở App cấm / Game</span>
              </div>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={violationData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorKhoa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGame" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(46,48,58,0.4)" />
                <XAxis dataKey="name" stroke="#374151" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis stroke="#374151" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(10,11,18,0.97)',
                    border: '1px solid rgba(46,48,58,0.7)',
                    borderRadius: 12,
                    backdropFilter: 'blur(16px)',
                  }}
                  itemStyle={{ color: '#e5e7eb', fontSize: 13 }}
                  labelStyle={{ color: '#9ca3af', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                />
                <Area
                  type="monotone"
                  dataKey="Khóa máy"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fill="url(#colorKhoa)"
                  dot={{ fill: '#ef4444', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="Chơi Game"
                  stroke="#eab308"
                  strokeWidth={2.5}
                  fill="url(#colorGame)"
                  dot={{ fill: '#eab308', strokeWidth: 0, r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Status Panel */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(14,15,21,0.88)', border: '1px solid rgba(46,48,58,0.6)', backdropFilter: 'blur(12px)' }}
        >
          <div className="mb-4">
            <div className="text-white font-semibold text-base">Phân bố Trạng thái Thiết bị</div>
            <div className="font-mono-data text-xs mt-0.5" style={{ color: '#6b7280' }}>
              Cập nhật theo thời gian thực
            </div>
          </div>

          <div className="flex items-center justify-center mb-5">
            <div
              className="relative w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                background:
                  'conic-gradient(#22c55e 0% ' +
                  onlinePercent +
                  '%, #eab308 ' +
                  onlinePercent +
                  '% ' +
                  (onlinePercent + warningPercent) +
                  '%, #ef4444 ' +
                  (onlinePercent + warningPercent) +
                  '% ' +
                  (onlinePercent + warningPercent + criticalPercent) +
                  '%, #374151 ' +
                  (onlinePercent + warningPercent + criticalPercent) +
                  '% 100%)',
                boxShadow: '0 0 30px rgba(170,59,255,0.2)',
              }}
            >
              <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center" style={{ background: '#0a0b12' }}>
                <div className="font-bold text-2xl text-white font-mono-data">{totalDevices}</div>
                <div className="text-[10px]" style={{ color: '#6b7280' }}>
                  thiết bị
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            {statusBars.map(({ label, percent, count, color, glow }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${glow}` }} />
                    <span style={{ color: '#9ca3af' }}>{label}</span>
                  </div>
                  <span className="font-mono-data font-bold" style={{ color }}>
                    {percent}% <span style={{ color: '#6b7280' }}>({count})</span>
                  </span>
                </div>
                <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(46,48,58,0.6)' }}>
                  <div
                    className="h-1.5 rounded-full transition-all duration-1000"
                    style={{ width: `${percent}%`, background: color, boxShadow: `0 0 8px ${glow}` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Live Devices & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Live Devices Quick Panel */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(14,15,21,0.88)', border: '1px solid rgba(46,48,58,0.6)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-white font-semibold text-base flex items-center gap-2">
                <MobileOutlined className="text-cyan-400" />
                Thiết bị trong hệ thống ({devices.length})
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Bấm vào thiết bị để xem màn hình trực tiếp & điều khiển</div>
            </div>
            <Button size="small" type="link" onClick={() => navigate('/devices')} className="!text-cyan-400">
              Xem tất cả →
            </Button>
          </div>

          {devices.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Chưa có thiết bị nào được ghi danh.
              <div className="mt-3">
                <Button type="primary" size="small" icon={<QrcodeOutlined />} onClick={() => navigate('/enrollments')}>
                  Tạo mã QR ghi danh
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {devices.slice(0, 6).map((dev: any) => {
                const isOnline = dev.status === 'ONLINE';
                const appName = dev.currentApp?.appName || dev.currentApp?.packageName || 'Màn hình chính';
                return (
                  <div
                    key={dev.id}
                    onClick={() => navigate(`/devices/${dev.id}`)}
                    className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:bg-[#1f202c]"
                    style={{ background: 'rgba(22,23,29,0.9)', border: '1px solid rgba(46,48,58,0.6)' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          background: isOnline ? '#22c55e' : '#64748b',
                          boxShadow: isOnline ? '0 0 8px #22c55e' : 'none',
                        }}
                      />
                      <div className="min-w-0">
                        <div className="text-white font-medium text-sm truncate">
                          {dev.deviceName || dev.model || 'Thiết bị Android'}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {dev.school?.name || 'Chưa gán trường'} {dev.classroom?.name ? `· Lớp ${dev.classroom.name}` : ''} ·{' '}
                          <span className="text-cyan-400">{appName}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/devices/${dev.id}`);
                      }}
                      style={{
                        background: 'rgba(0,212,255,0.12)',
                        borderColor: 'rgba(0,212,255,0.3)',
                        color: '#00d4ff',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    >
                      Chi tiết / Live
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Alerts Quick Panel */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(14,15,21,0.88)', border: '1px solid rgba(46,48,58,0.6)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-white font-semibold text-base flex items-center gap-2">
                <AlertOutlined className="text-red-400" />
                Cảnh báo Vi phạm Mới nhất
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Tự động cập nhật khi học sinh mở ứng dụng mạng xã hội / game</div>
            </div>
            <Button size="small" type="link" onClick={() => navigate('/alerts')} className="!text-purple-400">
              Trung tâm cảnh báo →
            </Button>
          </div>

          {recentAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">Không có cảnh báo vi phạm nào.</div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {recentAlerts.slice(0, 6).map((alert: any) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(22,23,29,0.9)', border: '1px solid rgba(46,48,58,0.6)' }}
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <Tag
                        color={alert.severity === 'CRITICAL' ? 'error' : 'warning'}
                        className="!m-0 text-[10px] font-bold border-0"
                      >
                        {alert.severity}
                      </Tag>
                      <span className="text-white font-medium text-sm truncate">
                        {alert.rule?.name || alert.title || 'Vi phạm chính sách'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 truncate">
                      Thiết bị:{' '}
                      <span
                        className="text-cyan-400 cursor-pointer hover:underline"
                        onClick={() => alert.device?.id && navigate(`/devices/${alert.device.id}`)}
                      >
                        {alert.device?.deviceName || 'Unknown'}
                      </span>{' '}
                      · {new Date(alert.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {alert.device?.id && (
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/devices/${alert.device.id}`)}
                        style={{ background: '#1f2028', borderColor: '#2e303a', color: '#e5e7eb', fontSize: 11 }}
                      >
                        Xem máy
                      </Button>
                    )}
                    {alert.status !== 'RESOLVED' ? (
                      <Button
                        size="small"
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={() => resolveAlertMutation.mutate({ id: alert.id, status: 'RESOLVED' })}
                        style={{ background: '#22c55e', border: 'none', fontSize: 11 }}
                      >
                        Xử lý
                      </Button>
                    ) : (
                      <Tag color="success" className="!m-0 text-[11px] border-0 bg-green-500/15 text-green-400">
                        Đã xử lý
                      </Tag>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
