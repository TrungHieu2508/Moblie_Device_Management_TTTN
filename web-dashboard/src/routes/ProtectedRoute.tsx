import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ADMIN'];

const ProtectedRoute = () => {
  const { isAuthenticated, user, logout } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Chặn hoàn toàn phiên đăng nhập cũ có role TEACHER không còn được hỗ trợ
  if (!ALLOWED_ROLES.includes(user.role)) {
    logout();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
