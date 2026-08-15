import { Card, Typography, Avatar, Descriptions, Tag, Button, Modal, Form, Input, message, DatePicker } from 'antd';
import { UserOutlined, SafetyCertificateOutlined, MailOutlined, EditOutlined, KeyOutlined, CalendarOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyProfile, updateMyProfile } from '../../services/userService';
import { useState } from 'react';

const { Title, Text } = Typography;

const ProfilePage = () => {
  const { user } = useAuthStore();
  const username = user?.username;
  const role = user?.role;
  const queryClient = useQueryClient();

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [form] = Form.useForm();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      message.success('Cập nhật thông tin thành công');
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      setIsEditModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const handleEditClick = () => {
    form.setFieldsValue({
      fullName: profile?.fullName || '',
      email: profile?.email || '',
    });
    setIsEditModalVisible(true);
  };

  const handleUpdate = (values: any) => {
    const payload: any = { 
      fullName: values.fullName,
    };
    if (values.email) {
      payload.email = values.email;
    }
    updateProfileMutation.mutate(payload);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3} className="!m-0 !text-white">Hồ sơ tài khoản</Title>
        <p className="text-gray-400 mt-1">Quản lý thông tin cá nhân và bảo mật</p>
      </div>

      <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg max-w-3xl">
        <div className="flex items-start gap-8">
          <div className="flex flex-col items-center gap-4">
            <Avatar 
              size={120} 
              icon={<UserOutlined />} 
              className="bg-gradient-to-r from-[var(--color-primary)] to-[#7e22ce] shadow-[0_0_20px_rgba(170,59,255,0.4)]"
            />
            <Tag 
              color={role === 'SUPER_ADMIN' ? 'purple' : 'blue'} 
              className="border-0 font-bold px-3 py-1 rounded-full text-sm m-0 text-center"
            >
              {role === 'SUPER_ADMIN' ? 'Quản trị Hệ thống' : 'Admin Cơ sở'}
            </Tag>
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-start mb-6">
              <div>
                <Title level={4} className="!m-0 !text-white !mb-1">{profile?.fullName || username}</Title>
                <Text className="text-gray-400 flex items-center gap-2">
                  <SafetyCertificateOutlined className="text-[var(--color-primary)]" />
                  ID Tài khoản: {profile?.id ? profile.id.split('-')[0].toUpperCase() : 'Đang tải...'}
                </Text>
              </div>
              <Button 
                type="primary" 
                icon={<EditOutlined />} 
                onClick={handleEditClick}
                className="bg-[#1f2028] border-[#2e303a] text-gray-300 hover:text-white hover:border-[var(--color-primary)] bg-transparent shadow-none"
              >
                Chỉnh sửa
              </Button>
            </div>

            <Descriptions column={1} className="profile-descriptions" labelStyle={{ color: '#9ca3af', width: '150px' }} contentStyle={{ color: '#f3f4f6', fontWeight: 500 }}>
              <Descriptions.Item label="Tên đăng nhập">{username}</Descriptions.Item>
              <Descriptions.Item label="Họ và tên">{profile?.fullName || 'Chưa cập nhật'}</Descriptions.Item>
              <Descriptions.Item label="Email">
                <span className="flex items-center gap-2">
                  <MailOutlined className="text-gray-500" />
                  {profile?.email || `${username}@eduguardian.edu.vn`}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Quyền hạn">{role}</Descriptions.Item>
              <Descriptions.Item label="Ngày tham gia">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
              </Descriptions.Item>
            </Descriptions>
          </div>
        </div>
      </Card>

      <Modal
        title="Chỉnh sửa Hồ sơ"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        className="dark-modal"
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate} className="mt-4">
          <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}>
            <Input prefix={<UserOutlined />} placeholder="Nhập họ và tên..." />
          </Form.Item>
          
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Vui lòng nhập email hợp lệ' }]}>
            <Input prefix={<MailOutlined />} placeholder="Nhập email..." />
          </Form.Item>

          <Form.Item label="Ngày tham gia">
            <Input 
              prefix={<CalendarOutlined />} 
              value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : 'N/A'} 
              disabled 
              className="bg-[#2e303a] text-gray-400 cursor-not-allowed"
            />
          </Form.Item>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={() => setIsEditModalVisible(false)} className="bg-transparent border-[#2e303a] text-gray-300 hover:text-white hover:border-gray-400">
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={updateProfileMutation.isPending} className="bg-[var(--color-primary)] border-0">
              Lưu thay đổi
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ProfilePage;
