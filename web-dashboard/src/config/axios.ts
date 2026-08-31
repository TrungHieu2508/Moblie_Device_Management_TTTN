import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Lấy base URL từ biến môi trường, hoặc lấy IP hiện tại của trình duyệt (hỗ trợ mạng LAN)
const isProd = import.meta.env.PROD;
const dynamicApiUrl = `http://${window.location.hostname}:8081/api`;
export const API_BASE_URL = isProd ? (import.meta.env.VITE_API_URL || dynamicApiUrl) : dynamicApiUrl;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for Request: Gắn Access Token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for Response: Xử lý 401 & Auto Refresh Token
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Tránh loop vô hạn nếu lỗi 401/403 khi đang gọi API refresh
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;
      
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          throw new Error("No refresh token");
        }
        
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken
        });
        
        const { accessToken: newAccessToken } = response.data.data;
        useAuthStore.getState().setTokens(newAccessToken, refreshToken);
        
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh token cũng lỗi -> Đăng xuất
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
