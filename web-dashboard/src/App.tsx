import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';

import Login from './features/auth/Login';
import DeviceListPage from './features/devices/views/DeviceListPage';
import DeviceDetailPage from './features/devices/views/DeviceDetailPage';
import EnrollmentListPage from './features/devices/views/EnrollmentListPage';
import AlertListPage from './features/alerts/views/AlertListPage';
import DashboardPage from './features/dashboard/views/DashboardPage';
import UserListPage from './features/users/views/UserListPage';
import SchoolListPage from './features/schools/views/SchoolListPage';
import CampusListPage from './features/schools/views/CampusListPage';
import ClassroomListPage from './features/schools/views/ClassroomListPage';
import ProfilePage from './features/profile/ProfilePage';
import TeacherDashboard from './features/schools/views/TeacherDashboard';
import SessionHistoryPage from './features/schools/views/SessionHistoryPage';
import LiveClassesPage from './features/schools/views/LiveClassesPage';
import Map3DPage from './features/map3d/Map3DPage';
import { useAuthStore } from './store/authStore';

import { Layout, Dropdown, Button } from 'antd';
import {
  AppstoreOutlined,
  DesktopOutlined,
  AlertOutlined,
  UserOutlined,
  LogoutOutlined,
  BankOutlined,
  EnvironmentOutlined,
  HistoryOutlined,
  QrcodeOutlined,
  GlobalOutlined,
  BookOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';

const { Header, Content, Sider } = Layout;

const getPageMeta = (pathname: string): { title: string; subtitle: string } => {
  if (pathname === '/') return { title: 'Dashboard Tổng quan', subtitle: 'Giám sát toàn diện hệ thống MDM học đường' };
  if (pathname.startsWith('/teacher') || pathname.includes('/dashboard'))
    return { title: 'Giám sát Lớp học & Màn hình Live', subtitle: 'Điều khiển tiết học và theo dõi màn hình học sinh trực tiếp' };
  if (pathname.startsWith('/live-classes'))
    return { title: 'Phiên Học Trực Tuyến', subtitle: 'Điều khiển thiết bị trong phiên học đang diễn ra' };
  if (pathname.startsWith('/devices/'))
    return { title: 'Chi tiết & Điều khiển Thiết bị', subtitle: 'Xem màn hình trực tiếp, khoá máy và theo dõi thông số' };
  if (pathname.startsWith('/devices'))
    return { title: 'Quản lý Thiết bị', subtitle: 'Danh sách toàn bộ thiết bị học sinh trong hệ thống' };
  if (pathname.startsWith('/enrollments'))
    return { title: 'Mã Ghi Danh (QR Enrollment)', subtitle: 'Tạo và quản lý mã QR đưa thiết bị vào hệ thống' };
  if (pathname.startsWith('/alerts'))
    return { title: 'Trung tâm Cảnh báo Vi phạm', subtitle: 'Theo dõi và xử lý các hành vi mở ứng dụng cấm hoặc vi phạm' };
  if (pathname.startsWith('/campuses'))
    return { title: 'Quản lý Khu vực (Campus)', subtitle: 'Quản lý danh sách cơ sở và phân bổ trường học' };
  if (pathname.startsWith('/schools'))
    return { title: 'Quản lý Trường học', subtitle: 'Quản lý danh sách trường học, lớp học và thiết bị trực thuộc' };
  if (pathname.startsWith('/classrooms'))
    return { title: 'Quản lý Lớp học', subtitle: 'Quản lý phòng học và sơ đồ thiết bị học sinh' };
  if (pathname.startsWith('/users'))
    return { title: 'Quản lý Tài khoản & Phân quyền', subtitle: 'Quản lý tài khoản Super Admin, IT Admin và Giáo viên' };
  if (pathname.startsWith('/history'))
    return { title: 'Lịch sử Buổi học', subtitle: 'Tra cứu nhật ký các phiên giám sát lớp học' };
  if (pathname.startsWith('/map3d'))
    return { title: 'Bản Đồ Số 3D Học Khu', subtitle: 'Trực quan hóa không gian 3D cơ sở, trường học và phòng học' };
  if (pathname.startsWith('/profile'))
    return { title: 'Hồ sơ Tài khoản', subtitle: 'Thông tin cá nhân và bảo mật tài khoản' };
  return { title: 'EduGuardian MDM Console', subtitle: 'Hệ thống Quản lý Thiết bị Di động Trường học' };
};

const SectionLabel = ({ label }: { label: string }) => (
  <div
    className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wider uppercase select-none"
    style={{ color: '#4b5563', fontFamily: "'JetBrains Mono', monospace" }}
  >
    {label}
  </div>
);

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const role = user?.role;
  const username = user?.username;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'Hồ sơ tài khoản',
        onClick: () => navigate('/profile'),
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Đăng xuất',
        danger: true,
        onClick: handleLogout,
      },
    ],
  };

  const roleLabel = role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'IT_ADMIN' ? 'IT Admin' : 'Giáo viên';
  const roleColor = role === 'SUPER_ADMIN' ? '#aa3bff' : role === 'IT_ADMIN' ? '#00d4ff' : '#4ade80';
  const pageMeta = getPageMeta(location.pathname);

  return (
    <Layout style={{ minHeight: '100vh', height: '100vh' }}>
      <Sider
        width={264}
        theme="dark"
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(46,48,58,0.65)',
        }}
      >
        <div className="flex flex-col h-full">
          {/* Logo area */}
          <div
            className="h-16 flex items-center px-5 border-b border-[rgba(170,59,255,0.12)] shrink-0 cursor-pointer"
            onClick={() => navigate(role === 'TEACHER' ? '/teacher' : '/')}
            style={{ background: 'linear-gradient(135deg, rgba(170,59,255,0.08), rgba(0,212,255,0.04))' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center glow-primary"
                style={{ background: 'linear-gradient(135deg, #aa3bff, #7b2ae8)', boxShadow: '0 0 20px rgba(170,59,255,0.5)' }}
              >
                <GlobalOutlined style={{ color: 'white', fontSize: 17 }} />
              </div>
              <div>
                <div className="text-white font-bold text-base leading-none tracking-tight text-glow-primary">
                  EduGuardian MDM
                </div>
                <div className="text-[11px] font-mono-data mt-1 font-semibold" style={{ color: roleColor }}>
                  ● {roleLabel}
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Grouped Navigation Menu */}
          <div className="px-3 py-3 flex-1 overflow-y-auto flex flex-col gap-0.5">
            {role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? (
              <>
                <SectionLabel label="Tổng quan & Giám sát" />
                <NavItem
                  path="/"
                  exact
                  icon={<AppstoreOutlined />}
                  label="Dashboard Tổng quan"
                  current={location.pathname}
                  navigate={navigate}
                />
                <NavItem
                  path="/teacher"
                  icon={<VideoCameraOutlined />}
                  label="Giám sát Lớp học & Live"
                  current={location.pathname}
                  navigate={navigate}
                  isCyan
                />
                <NavItem
                  path="/map3d"
                  icon={<GlobalOutlined />}
                  label="Bản Đồ Số 3D"
                  current={location.pathname}
                  navigate={navigate}
                  isCyan
                />

                <SectionLabel label="Thiết bị & An ninh" />
                <NavItem
                  path="/devices"
                  icon={<DesktopOutlined />}
                  label="Quản lý Thiết bị"
                  current={location.pathname}
                  navigate={navigate}
                />
                <NavItem
                  path="/enrollments"
                  icon={<QrcodeOutlined />}
                  label="Mã Ghi Danh (QR)"
                  current={location.pathname}
                  navigate={navigate}
                />
                <NavItem
                  path="/alerts"
                  icon={<AlertOutlined />}
                  label="Cảnh báo Vi phạm"
                  current={location.pathname}
                  navigate={navigate}
                  isAlert
                />

                <SectionLabel label="Quản lý Tổ chức" />
                {role === 'SUPER_ADMIN' && (
                  <NavItem
                    path="/campuses"
                    icon={<EnvironmentOutlined />}
                    label="Khu vực (Campus)"
                    current={location.pathname}
                    navigate={navigate}
                  />
                )}
                <NavItem
                  path="/schools"
                  icon={<BankOutlined />}
                  label="Trường học"
                  current={location.pathname}
                  navigate={navigate}
                />
                <NavItem
                  path="/classrooms"
                  icon={<BookOutlined />}
                  label="Lớp học"
                  current={location.pathname}
                  navigate={navigate}
                />

                <SectionLabel label="Quản trị Hệ thống" />
                <NavItem
                  path="/users"
                  icon={<UserOutlined />}
                  label="Tài khoản & Phân quyền"
                  current={location.pathname}
                  navigate={navigate}
                />
                <NavItem
                  path="/history"
                  icon={<HistoryOutlined />}
                  label="Lịch sử Buổi học"
                  current={location.pathname}
                  navigate={navigate}
                />
              </>
            ) : null}

            {role === 'TEACHER' ? (
              <>
                <SectionLabel label="Giảng dạy & Giám sát" />
                <NavItem
                  path="/teacher"
                  icon={<VideoCameraOutlined />}
                  label="Lớp học & Giám sát Live"
                  current={location.pathname}
                  navigate={navigate}
                  isCyan
                />
                <NavItem
                  path="/devices"
                  icon={<DesktopOutlined />}
                  label="Thiết bị Học sinh"
                  current={location.pathname}
                  navigate={navigate}
                />
                <NavItem
                  path="/enrollments"
                  icon={<QrcodeOutlined />}
                  label="Mã Ghi Danh (QR)"
                  current={location.pathname}
                  navigate={navigate}
                />
                <NavItem
                  path="/alerts"
                  icon={<AlertOutlined />}
                  label="Cảnh báo Vi phạm"
                  current={location.pathname}
                  navigate={navigate}
                  isAlert
                />

                <SectionLabel label="Lớp học & Tiện ích" />
                <NavItem
                  path="/classrooms"
                  icon={<BookOutlined />}
                  label="Quản lý Lớp học"
                  current={location.pathname}
                  navigate={navigate}
                />
                <NavItem
                  path="/history"
                  icon={<HistoryOutlined />}
                  label="Lịch sử Buổi học"
                  current={location.pathname}
                  navigate={navigate}
                />
                <NavItem
                  path="/map3d"
                  icon={<GlobalOutlined />}
                  label="Bản Đồ 3D"
                  current={location.pathname}
                  navigate={navigate}
                  isCyan
                />
              </>
            ) : null}
          </div>

          {/* Bottom user card */}
          <div className="p-3 border-t border-[rgba(170,59,255,0.12)] shrink-0 bg-[#08090f]">
            <div
              className="flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-300 hover:bg-[rgba(170,59,255,0.08)]"
              onClick={() => navigate('/profile')}
            >
              <div className="avatar-ring">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg, #aa3bff, #7b2ae8)' }}
                >
                  {username?.[0]?.toUpperCase() || 'A'}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate">{username || 'Admin'}</div>
                <div className="flex items-center gap-1.5">
                  <div className="live-dot" style={{ width: 6, height: 6 }}></div>
                  <span className="text-[11px] text-green-400 font-medium">{roleLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Sider>

      <Layout>
        {/* Header */}
        <Header className="px-6 flex items-center" style={{ position: 'relative', height: 64, lineHeight: 'normal' }}>
          {/* Gradient line at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(170,59,255,0.5), rgba(0,212,255,0.5), transparent)' }}
          />

          <div className="flex items-center gap-3 min-w-0">
            <div>
              <div className="text-white font-semibold text-sm sm:text-base leading-tight truncate">
                {pageMeta.title}
              </div>
              <div className="hidden md:block text-xs text-gray-400 leading-tight mt-0.5 truncate">
                {pageMeta.subtitle}
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Quick action shortcuts for Admin/Teacher */}
            <div className="hidden lg:flex items-center gap-2">
              <Button
                size="small"
                icon={<VideoCameraOutlined />}
                onClick={() => navigate('/teacher')}
                style={{
                  background: location.pathname.startsWith('/teacher') ? 'rgba(0,212,255,0.2)' : 'rgba(20,21,30,0.85)',
                  borderColor: 'rgba(0,212,255,0.35)',
                  color: '#00d4ff',
                  borderRadius: 8,
                  fontSize: 12,
                  height: 32,
                }}
              >
                Giám sát Live
              </Button>
              <Button
                size="small"
                icon={<QrcodeOutlined />}
                onClick={() => navigate('/enrollments')}
                style={{
                  background: location.pathname.startsWith('/enrollments') ? 'rgba(170,59,255,0.2)' : 'rgba(20,21,30,0.85)',
                  borderColor: 'rgba(170,59,255,0.35)',
                  color: '#d8b4fe',
                  borderRadius: 8,
                  fontSize: 12,
                  height: 32,
                }}
              >
                Mã QR
              </Button>
            </div>

            {/* Live status indicator */}
            <div
              className="hidden sm:flex items-center gap-2 text-xs px-2.5 py-1 rounded-lg border"
              style={{ color: '#4ade80', borderColor: 'rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.08)' }}
            >
              <div className="live-dot"></div>
              <span className="font-mono-data font-semibold">WS LIVE</span>
            </div>

            <Dropdown menu={userMenu} placement="bottomRight" arrow>
              <div
                className="flex items-center gap-2.5 cursor-pointer px-3 py-1.5 rounded-xl transition-all duration-300"
                style={{ background: 'rgba(20,21,30,0.8)', border: '1px solid rgba(46,48,58,0.6)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(170,59,255,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(46,48,58,0.6)')}
              >
                <div className="avatar-ring">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ background: 'linear-gradient(135deg, #aa3bff, #7b2ae8)' }}
                  >
                    {username?.[0]?.toUpperCase() || 'A'}
                  </div>
                </div>
                <span className="text-white font-medium text-sm">{username || 'Admin'}</span>
                <div
                  className="text-[10px] px-1.5 py-0.5 rounded font-mono-data font-bold"
                  style={{ background: `${roleColor}20`, color: roleColor }}
                >
                  {roleLabel}
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            background: '#050507',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

// Custom nav item component
const NavItem = ({ path, exact, icon, label, current, navigate, isCyan, isAlert }: any) => {
  const isActive = exact ? current === path : current === path || (path !== '/' && current.startsWith(path));
  const activeColor = isCyan ? '#00d4ff' : isAlert ? '#ff6b35' : '#aa3bff';
  const activeBg = isCyan
    ? 'linear-gradient(135deg, rgba(0,212,255,0.16), rgba(0,212,255,0.05))'
    : isAlert
    ? 'linear-gradient(135deg, rgba(255,107,53,0.16), rgba(255,107,53,0.05))'
    : 'linear-gradient(135deg, rgba(170,59,255,0.22), rgba(0,212,255,0.08))';

  return (
    <div
      onClick={() => navigate(path)}
      className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 select-none"
      style={{
        background: isActive ? activeBg : 'transparent',
        color: isActive ? '#ffffff' : '#9ca3af',
        boxShadow: isActive ? `inset 3px 0 0 ${activeColor}, 0 0 16px ${activeColor}18` : 'none',
        fontWeight: isActive ? 600 : 500,
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = `rgba(${isCyan ? '0,212,255' : isAlert ? '255,107,53' : '170,59,255'}, 0.09)`;
          e.currentTarget.style.color = '#ffffff';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#9ca3af';
        }
      }}
    >
      <span style={{ fontSize: 15, color: isActive ? activeColor : 'inherit' }}>{icon}</span>
      <span style={{ fontSize: 13.5, color: 'inherit' }} className="truncate">
        {label}
      </span>
      {isActive && (
        <div
          className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: activeColor, boxShadow: `0 0 6px ${activeColor}` }}
        />
      )}
    </div>
  );
};

function App() {
  const { user } = useAuthStore();
  const role = user?.role;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={role !== 'TEACHER' ? <DashboardPage /> : <Navigate to="/teacher" replace />} />
          <Route path="/map3d" element={<Map3DPage />} />
          <Route path="/devices" element={<DeviceListPage />} />
          <Route path="/devices/:id" element={<DeviceDetailPage />} />
          <Route path="/enrollments" element={<EnrollmentListPage />} />
          <Route path="/alerts" element={<AlertListPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Super Admin & IT Admin Routes */}
          <Route path="/campuses" element={role === 'SUPER_ADMIN' ? <CampusListPage /> : <Navigate to="/" replace />} />
          <Route path="/schools" element={role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? <SchoolListPage /> : <Navigate to="/" replace />} />
          <Route
            path="/classrooms"
            element={role === 'SUPER_ADMIN' || role === 'IT_ADMIN' || role === 'TEACHER' ? <ClassroomListPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/schools/:schoolId/dashboard"
            element={role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? <TeacherDashboard /> : <Navigate to="/" replace />}
          />
          <Route path="/users" element={role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? <UserListPage /> : <Navigate to="/" replace />} />

          {/* Classroom & Live Screen Monitoring Route (All Staff Roles) */}
          <Route
            path="/teacher"
            element={role === 'TEACHER' || role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? <TeacherDashboard /> : <Navigate to="/" replace />}
          />
          <Route
            path="/history"
            element={role === 'TEACHER' || role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? <SessionHistoryPage /> : <Navigate to="/" replace />}
          />
          <Route path="/live-classes/:sessionId" element={<LiveClassesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
