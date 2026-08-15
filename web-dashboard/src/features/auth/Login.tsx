import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../config/axios';
import { useAuthStore } from '../../store/authStore';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setTokens = useAuthStore(state => state.setTokens);
  const setUser = useAuthStore(state => state.setUser);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Assuming Backend Auth API: /auth/login
      const res = await axiosInstance.post('/auth/login', {
        username: values.username,
        password: values.password
      });

      const { accessToken, refreshToken, user } = res.data.data;
      
      setTokens(accessToken, refreshToken);
      setUser(user);
      
      message.success('Đăng nhập thành công!');
      navigate('/');
    } catch (error: any) {
      console.error("Login failed:", error);
      message.error(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản và mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0a0f]">
      {/* Animated Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-[var(--color-primary)] opacity-20 blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] rounded-full bg-[#3b82f6] opacity-20 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-md p-10 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <SafetyCertificateOutlined className="text-5xl text-[var(--color-primary)] mb-4 drop-shadow-[0_0_15px_rgba(170,59,255,0.5)]" />
          <h1 className="text-3xl font-bold text-white tracking-tight m-0">EduGuardian</h1>
          <p className="text-gray-400 mt-2">Mobile Device Management Console</p>
        </div>

        <Form
          name="login_form"
          layout="vertical"
          onFinish={onFinish}
          size="large"
          className="mt-6"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Vui lòng nhập tên tài khoản!' }]}
          >
            <Input 
              prefix={<UserOutlined className="text-gray-400" />} 
              placeholder="Tên đăng nhập" 
              className="bg-black/20 border-white/10 text-white placeholder-gray-500 hover:border-[var(--color-primary)] focus:border-[var(--color-primary)]"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Mật khẩu"
              className="bg-black/20 border-white/10 text-white hover:border-[var(--color-primary)] focus:border-[var(--color-primary)]"
            />
          </Form.Item>

          <Form.Item className="mt-8">
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[#7e22ce] border-0 h-12 text-base font-semibold shadow-[0_0_20px_rgba(170,59,255,0.4)] hover:shadow-[0_0_30px_rgba(170,59,255,0.6)] transition-all"
            >
              ĐĂNG NHẬP HỆ THỐNG
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Login;
