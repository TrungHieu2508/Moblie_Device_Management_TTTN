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

// Placeholder Layout
import { Layout, Dropdown } from 'antd';
import { AppstoreOutlined, DesktopOutlined, AlertOutlined, UserOutlined, LogoutOutlined, BankOutlined, EnvironmentOutlined, HistoryOutlined, QrcodeOutlined, GlobalOutlined, BookOutlined } from '@ant-design/icons';

const { Header, Content, Sider } = Layout;

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

  return (
    <Layout style={{ minHeight: '100vh', height: '100vh' }}>
      <Sider width={256} theme="dark">
        {/* Logo area */}
        <div className="h-16 flex items-center px-5 border-b border-[rgba(170,59,255,0.12)]"
          style={{ background: 'linear-gradient(135deg, rgba(170,59,255,0.08), rgba(0,212,255,0.04))' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center glow-primary"
              style={{ background: 'linear-gradient(135deg, #aa3bff, #7b2ae8)', boxShadow: '0 0 20px rgba(170,59,255,0.5)' }}>
              <GlobalOutlined style={{ color: 'white', fontSize: 16 }} />
            </div>
            <div>
              <div className="text-white font-bold text-base leading-none tracking-tight text-glow-primary">MDM Console</div>
              <div className="text-[10px] font-mono-data mt-0.5" style={{ color: roleColor }}>● {roleLabel}</div>
            </div>
          </div>
        </div>

        {/* Navigation menu */}
        <div className="px-3 pt-4 pb-4 flex flex-col gap-1">
          {role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? (
            <>
              <NavItem path="/" icon={<AppstoreOutlined />} label="Dashboard" current={location.pathname} navigate={navigate} />
              <NavItem path="/map3d" icon={<GlobalOutlined />} label="Bản Đồ 3D" current={location.pathname} navigate={navigate} isCyan />
              <NavItem path="/devices" icon={<DesktopOutlined />} label="Thiết bị" current={location.pathname} navigate={navigate} />
              <NavItem path="/enrollments" icon={<QrcodeOutlined />} label="Mã ghi danh" current={location.pathname} navigate={navigate} />
              <NavItem path="/alerts" icon={<AlertOutlined />} label="Cảnh báo" current={location.pathname} navigate={navigate} isAlert />
            </>
          ) : null}
          {role === 'SUPER_ADMIN' ? (
            <NavItem path="/campuses" icon={<EnvironmentOutlined />} label="Quản lý Khu vực" current={location.pathname} navigate={navigate} />
          ) : null}
          {role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? (
            <>
              <NavItem path="/schools" icon={<BankOutlined />} label="Quản lý Trường học" current={location.pathname} navigate={navigate} />
              <NavItem path="/classrooms" icon={<BookOutlined />} label="Quản lý Lớp học" current={location.pathname} navigate={navigate} />
            </>
          ) : null}
          {role === 'SUPER_ADMIN' ? (
            <NavItem path="/users" icon={<UserOutlined />} label="Quản lý Tài khoản" current={location.pathname} navigate={navigate} />
          ) : null}
          {role === 'TEACHER' ? (
            <>
              <NavItem path="/map3d" icon={<GlobalOutlined />} label="Bản Đồ 3D" current={location.pathname} navigate={navigate} isCyan />
              <NavItem path="/teacher" icon={<DesktopOutlined />} label="Lớp học" current={location.pathname} navigate={navigate} />
            </>
          ) : null}
          {role === 'TEACHER' || role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? (
            <NavItem path="/history" icon={<HistoryOutlined />} label="Lịch sử buổi học" current={location.pathname} navigate={navigate} />
          ) : null}
        </div>

        {/* Bottom user card */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-[rgba(170,59,255,0.1)]">
          <div className="flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-300 hover:bg-[rgba(170,59,255,0.08)]"
            onClick={() => navigate('/profile')}>
            <div className="avatar-ring">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, #aa3bff, #7b2ae8)' }}>
                {username?.[0]?.toUpperCase() || 'A'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold truncate">{username || 'Admin'}</div>
              <div className="flex items-center gap-1">
                <div className="live-dot" style={{ width: 6, height: 6 }}></div>
                <span className="text-[10px] text-green-400">Online</span>
              </div>
            </div>
          </div>
        </div>
      </Sider>

      <Layout>
        {/* Header */}
        <Header className="px-6 flex items-center"
          style={{ position: 'relative' }}>
          {/* Gradient line at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(170,59,255,0.5), rgba(0,212,255,0.5), transparent)' }} />

          <div className="flex items-center gap-2">
            <div className="text-xs font-mono-data px-3 py-1 rounded-full border"
              style={{ color: '#6b7280', borderColor: 'rgba(46,48,58,0.6)', background: 'rgba(20,21,30,0.8)' }}>
              {location.pathname === '/' ? '/ dashboard' : location.pathname}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            {/* Live status indicator */}
            <div className="hidden sm:flex items-center gap-2 text-xs"
              style={{ color: '#6b7280' }}>
              <div className="live-dot"></div>
              <span className="font-mono-data">LIVE</span>
            </div>

            <Dropdown menu={userMenu} placement="bottomRight" arrow>
              <div className="flex items-center gap-3 cursor-pointer px-3 py-1.5 rounded-xl transition-all duration-300"
                style={{ background: 'rgba(20,21,30,0.8)', border: '1px solid rgba(46,48,58,0.6)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(170,59,255,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(46,48,58,0.6)')}>
                <div className="avatar-ring">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ background: 'linear-gradient(135deg, #aa3bff, #7b2ae8)' }}>
                    {username?.[0]?.toUpperCase() || 'A'}
                  </div>
                </div>
                <span className="text-white font-medium text-sm">{username || 'Admin'}</span>
                <div className="text-[10px] px-1.5 py-0.5 rounded font-mono-data font-bold"
                  style={{ background: 'rgba(170,59,255,0.15)', color: '#aa3bff' }}>{role?.replace('_', ' ')}</div>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{
          background: '#050507',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

// Custom nav item component
const NavItem = ({ path, icon, label, current, navigate, isCyan, isAlert }: any) => {
  const isActive = current === path;
  const activeColor = isCyan ? '#00d4ff' : isAlert ? '#ff6b35' : '#aa3bff';
  const activeBg = isCyan
    ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,212,255,0.05))'
    : isAlert
    ? 'linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,107,53,0.05))'
    : 'linear-gradient(135deg, rgba(170,59,255,0.2), rgba(0,212,255,0.08))';

  return (
    <div
      onClick={() => navigate(path)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-250 select-none"
      style={{
        background: isActive ? activeBg : 'transparent',
        color: isActive ? activeColor : '#6b7280',
        boxShadow: isActive ? `inset 3px 0 0 ${activeColor}, 0 0 20px ${activeColor}20` : 'none',
        transform: isActive ? 'translateX(2px)' : 'translateX(0)',
        fontWeight: isActive ? 600 : 500,
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = `rgba(${isCyan ? '0,212,255' : isAlert ? '255,107,53' : '170,59,255'}, 0.08)`;
          e.currentTarget.style.color = activeColor;
          e.currentTarget.style.transform = 'translateX(4px)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#6b7280';
          e.currentTarget.style.transform = 'translateX(0)';
        }
      }}
    >
      <span style={{ fontSize: 16, color: 'inherit' }}>{icon}</span>
      <span style={{ fontSize: 14, color: 'inherit' }}>{label}</span>
      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: activeColor, boxShadow: `0 0 6px ${activeColor}` }} />}
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
          <Route path="/devices" element={role !== 'TEACHER' ? <DeviceListPage /> : <Navigate to="/teacher" replace />} />
          <Route path="/devices/:id" element={role !== 'TEACHER' ? <DeviceDetailPage /> : <Navigate to="/teacher" replace />} />
          <Route path="/enrollments" element={role !== 'TEACHER' ? <EnrollmentListPage /> : <Navigate to="/teacher" replace />} />
          <Route path="/alerts" element={role !== 'TEACHER' ? <AlertListPage /> : <Navigate to="/teacher" replace />} />
          <Route path="/profile" element={<ProfilePage />} />
          
          {/* Super Admin & IT Admin Routes */}
          <Route path="/campuses" element={role === 'SUPER_ADMIN' ? <CampusListPage /> : <Navigate to="/" replace />} />
          <Route path="/schools" element={role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? <SchoolListPage /> : <Navigate to="/" replace />} />
          <Route path="/classrooms" element={role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? <ClassroomListPage /> : <Navigate to="/" replace />} />
          <Route path="/schools/:schoolId/dashboard" element={role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? <TeacherDashboard /> : <Navigate to="/" replace />} />
          <Route path="/users" element={role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? <UserListPage /> : <Navigate to="/" replace />} />
          
          {/* Teacher Routes */}
          <Route path="/teacher" element={role === 'TEACHER' ? <TeacherDashboard /> : <Navigate to="/" replace />} />
          <Route path="/history" element={role === 'TEACHER' || role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? <SessionHistoryPage /> : <Navigate to="/" replace />} />
          <Route path="/live-classes/:sessionId" element={<LiveClassesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
