import { Routes, Route, Navigate } from 'react-router-dom';
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
import { Outlet } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Space } from 'antd';
import { AppstoreOutlined, DesktopOutlined, AlertOutlined, UserOutlined, LogoutOutlined, BankOutlined, EnvironmentOutlined, HistoryOutlined, QrcodeOutlined, GlobalOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

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

  return (
    <Layout className="min-h-screen">
      <Sider width={250} theme="dark" className="border-r border-[#2e303a]">
        <div className="h-16 flex items-center justify-center border-b border-[#2e303a]">
          <h2 className="text-[var(--color-primary)] font-bold text-xl m-0 tracking-tight">MDM Console</h2>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={[
            ...(role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? [
              { key: '/', icon: <AppstoreOutlined />, label: 'Dashboard', onClick: () => navigate('/') },
              { key: '/map3d', icon: <GlobalOutlined />, label: 'Bản Đồ 3D', onClick: () => navigate('/map3d') },
              { key: '/devices', icon: <DesktopOutlined />, label: 'Devices', onClick: () => navigate('/devices') },
              { key: '/enrollments', icon: <QrcodeOutlined />, label: 'Mã ghi danh', onClick: () => navigate('/enrollments') },
              { key: '/alerts', icon: <AlertOutlined />, label: 'Alerts', onClick: () => navigate('/alerts') },
            ] : []),
            ...(role === 'SUPER_ADMIN' ? [
              { key: '/campuses', icon: <EnvironmentOutlined />, label: 'Quản lý Khu vực', onClick: () => navigate('/campuses') }
            ] : []),
            ...(role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? [
              { key: '/schools', icon: <BankOutlined />, label: 'Quản lý Trường học', onClick: () => navigate('/schools') },
              { key: '/classrooms', icon: <BookOutlined />, label: 'Quản lý Lớp học', onClick: () => navigate('/classrooms') }
            ] : []),
            ...(role === 'SUPER_ADMIN' ? [
              { key: '/users', icon: <UserOutlined />, label: 'Quản lý Tài khoản', onClick: () => navigate('/users') }
            ] : []),
            ...(role === 'TEACHER' ? [
              { key: '/map3d', icon: <GlobalOutlined />, label: 'Bản Đồ 3D', onClick: () => navigate('/map3d') },
              { key: '/teacher', icon: <DesktopOutlined />, label: 'Lớp học (Teacher)', onClick: () => navigate('/teacher') },
            ] : []),
            ...(role === 'TEACHER' || role === 'SUPER_ADMIN' || role === 'IT_ADMIN' ? [
              { key: '/history', icon: <HistoryOutlined />, label: 'Lịch sử buổi học', onClick: () => navigate('/history') }
            ] : []),
          ]}
          className="border-none mt-4"
        />
      </Sider>
      <Layout>
        <Header className="px-6 flex items-center border-b border-[#2e303a]">
          <div className="text-gray-300">Admin Dashboard</div>
          <div className="ml-auto flex items-center gap-6">
            
            <Dropdown menu={userMenu} placement="bottomRight" arrow>
              <div className="flex items-center gap-2 cursor-pointer hover:bg-[#1f2028] p-2 rounded-lg transition-colors">
                <Avatar icon={<UserOutlined />} className="bg-[var(--color-primary)]" />
                <span className="text-white font-medium">{username || 'Admin'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="bg-[#0f1015] overflow-auto">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
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
