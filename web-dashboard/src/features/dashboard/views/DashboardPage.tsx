import { useRef, useEffect } from 'react';
import { Typography, Spin } from 'antd';
import { MobileOutlined, AlertOutlined, SafetyCertificateOutlined, WifiOutlined, LoadingOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../../../services/dashboardService';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const { Title, Text } = Typography;

// Animated number counter
const CountUp = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start = 0;
    const duration = 1200;
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

// Stat card with 3D tilt
const StatCard = ({ title, value, suffix, icon, color, glowColor, gradient, delay = 0 }: any) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    card.style.boxShadow = `0 20px 60px ${glowColor}30, 0 0 30px ${glowColor}15`;
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
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="stat-count-up rounded-2xl p-5 cursor-default"
      style={{
        background: gradient,
        border: `1px solid ${glowColor}25`,
        transition: 'transform 0.15s ease, box-shadow 0.3s ease',
        boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
        animationDelay: `${delay}ms`,
        transformStyle: 'preserve-3d',
      }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${glowColor}20`, border: `1px solid ${glowColor}30` }}>
          <span style={{ color: glowColor, fontSize: 18 }}>{icon}</span>
        </div>
        <div className="text-[10px] font-mono-data px-2 py-1 rounded-lg"
          style={{ background: `${glowColor}12`, color: glowColor, border: `1px solid ${glowColor}20` }}>
          LIVE
        </div>
      </div>
      <div className="font-bold text-4xl mb-1" style={{ color: color, fontFamily: "'JetBrains Mono', monospace" }}>
        <CountUp value={value} suffix={suffix} />
      </div>
      <div className="text-sm font-medium" style={{ color: '#6b7280' }}>{title}</div>
      {/* Shine effect */}
      <div className="absolute top-0 left-0 w-full h-px rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${glowColor}60, transparent)` }} />
    </div>
  );
};

const DashboardPage = () => {
  useWebSocket(); // Keep WebSocket alive

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#aa3bff' }} spin />} />
        <div className="font-mono-data text-sm" style={{ color: '#6b7280' }}>Đang tải dữ liệu...</div>
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

  const violationData = summary?.violationData?.map((item: any) => ({
    name: item.name,
    'Khóa máy': item.locked,
    'Chơi Game': item.gaming
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
    { title: 'Tổng thiết bị', value: totalDevices, icon: <MobileOutlined />, color: '#e2d4ff', glowColor: '#aa3bff', gradient: 'linear-gradient(135deg, rgba(170,59,255,0.12), rgba(170,59,255,0.04))' },
    { title: 'Đang Online', value: summary?.onlineDevices || 0, icon: <WifiOutlined />, color: '#4ade80', glowColor: '#22c55e', gradient: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))' },
    { title: 'Cảnh báo chưa xử lý', value: summary?.unresolvedAlerts || 0, icon: <AlertOutlined />, color: '#f87171', glowColor: '#ef4444', gradient: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))' },
    { title: 'Chỉ số An toàn', value: summary?.safetyIndex || 100, suffix: '%', icon: <SafetyCertificateOutlined />, color: '#60a5fa', glowColor: '#3b82f6', gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))' },
  ];

  const statusBars = [
    { label: 'Online', percent: onlinePercent, count: summary?.onlineDevices || 0, color: '#22c55e', glow: 'rgba(34,197,94,0.5)' },
    { label: 'Offline', percent: offlinePercent, count: summary?.offlineDevices || 0, color: '#64748b', glow: 'rgba(100,116,139,0.4)' },
    { label: 'Warning', percent: warningPercent, count: summary?.warningDevices || 0, color: '#eab308', glow: 'rgba(234,179,8,0.5)' },
    { label: 'Critical', percent: criticalPercent, count: summary?.criticalDevices || 0, color: '#ef4444', glow: 'rgba(239,68,68,0.5)' },
  ];

  return (
    <div className="p-6" style={{ background: '#050507' }}>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(170,59,255,0.3), rgba(0,212,255,0.2))', border: '1px solid rgba(170,59,255,0.3)' }}>
            <ThunderboltOutlined style={{ color: '#aa3bff', fontSize: 16 }} />
          </div>
          <Title level={3} className="!m-0 !text-white" style={{ letterSpacing: '-0.02em' }}>Tổng quan Hệ thống</Title>
          <div className="flex items-center gap-1.5 ml-2">
            <div className="live-dot" />
            <span className="font-mono-data text-xs" style={{ color: '#4ade80' }}>REAL-TIME</span>
          </div>
        </div>
        <Text className="font-mono-data" style={{ color: '#4b5563', fontSize: 12 }}>
          Giám sát trạng thái hoạt động toàn bộ thiết bị trong học khu
        </Text>
      </div>

      {/* Stats Cards — 3D Tilt */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((card, i) => (
          <div key={card.title} className="relative">
            <StatCard {...card} delay={i * 100} />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Line Chart */}
        <div className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: 'rgba(14,15,21,0.88)', border: '1px solid rgba(46,48,58,0.5)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-white font-semibold text-base">Biểu đồ Vi phạm</div>
              <div className="font-mono-data text-xs mt-0.5" style={{ color: '#4b5563' }}>7 ngày gần nhất</div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.6)' }} />
                <span style={{ color: '#9ca3af' }}>Khóa máy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#eab308', boxShadow: '0 0 6px rgba(234,179,8,0.6)' }} />
                <span style={{ color: '#9ca3af' }}>Chơi Game</span>
              </div>
            </div>
          </div>
          <div style={{ height: 280 }}>
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
                  contentStyle={{ backgroundColor: 'rgba(10,11,18,0.97)', border: '1px solid rgba(46,48,58,0.7)', borderRadius: 12, backdropFilter: 'blur(16px)' }}
                  itemStyle={{ color: '#e5e7eb', fontSize: 13 }}
                  labelStyle={{ color: '#9ca3af', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                />
                <Area type="monotone" dataKey="Khóa máy" stroke="#ef4444" strokeWidth={2.5} fill="url(#colorKhoa)" dot={{ fill: '#ef4444', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
                <Area type="monotone" dataKey="Chơi Game" stroke="#eab308" strokeWidth={2.5} fill="url(#colorGame)" dot={{ fill: '#eab308', strokeWidth: 0, r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Status Panel */}
        <div className="rounded-2xl p-5"
          style={{ background: 'rgba(14,15,21,0.88)', border: '1px solid rgba(46,48,58,0.5)', backdropFilter: 'blur(12px)' }}>
          <div className="mb-5">
            <div className="text-white font-semibold text-base">Phân bố Thiết bị</div>
            <div className="font-mono-data text-xs mt-0.5" style={{ color: '#4b5563' }}>Trạng thái theo thời gian thực</div>
          </div>

          {/* Big donut-style display */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-28 h-28 rounded-full flex items-center justify-center"
              style={{ background: 'conic-gradient(#22c55e 0% ' + onlinePercent + '%, #eab308 ' + onlinePercent + '% ' + (onlinePercent + warningPercent) + '%, #ef4444 ' + (onlinePercent + warningPercent) + '% ' + (onlinePercent + warningPercent + criticalPercent) + '%, #374151 ' + (onlinePercent + warningPercent + criticalPercent) + '% 100%)', boxShadow: '0 0 30px rgba(170,59,255,0.2)' }}>
              <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center"
                style={{ background: '#0a0b12' }}>
                <div className="font-bold text-2xl text-white font-mono-data">{totalDevices}</div>
                <div className="text-[10px]" style={{ color: '#4b5563' }}>tổng</div>
              </div>
            </div>
          </div>

          {/* Status bars */}
          <div className="space-y-4">
            {statusBars.map(({ label, percent, count, color, glow }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${glow}` }} />
                    <span style={{ color: '#9ca3af' }}>{label}</span>
                  </div>
                  <span className="font-mono-data font-bold" style={{ color }}>{percent}% <span style={{ color: '#4b5563' }}>({count})</span></span>
                </div>
                <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(46,48,58,0.6)' }}>
                  <div className="h-1.5 rounded-full transition-all duration-1000"
                    style={{ width: `${percent}%`, background: color, boxShadow: `0 0 8px ${glow}` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
