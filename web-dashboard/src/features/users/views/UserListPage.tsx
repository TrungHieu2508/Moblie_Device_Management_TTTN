import { useState } from 'react';
import { Table, Tag, Input, Button, Modal, Form, Select, Space, Card, Typography, message } from 'antd';
import { SearchOutlined, PlusOutlined, UserOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser, updateUser, deleteUser } from '../../../services/userService';
import { getAllCampuses, getSchools } from '../../../services/schoolService';
import type { UserDto } from '../../../services/userService';

const { Title } = Typography;

const UserListPage = () => {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, searchText],
    queryFn: () => getUsers({ page, size: 10, search: searchText || undefined }),
  });

  const { data: campusesData } = useQuery({
    queryKey: ['campuses'],
    queryFn: () => getAllCampuses(),
  });

  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: () => getSchools({ page: 0, size: 1000 }), // Get all schools for dropdown
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      message.success('Tạo tài khoản thành công');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra khi tạo tài khoản';
      message.error(errorMsg);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: any }) => updateUser(id, payload),
    onSuccess: () => {
      message.success('Cập nhật tài khoản thành công');
      setIsEditModalVisible(false);
      editForm.resetFields();
      setEditingUserId(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      console.error("Update User Error:", error);
      let errorMsg = 'Có lỗi xảy ra khi cập nhật tài khoản';
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.response?.data?.errorCode) {
        errorMsg = "Lỗi từ máy chủ: " + error.response.data.errorCode;
      } else if (error.message) {
        errorMsg = error.message;
      }
      message.error(errorMsg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      message.success('Đã xóa tài khoản');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => message.error('Không thể xóa tài khoản này')
  });

  const handleCreate = (values: any) => {
    const payload = { ...values };
    if (!payload.campusId || payload.campusId === '') {
      delete payload.campusId;
    }
    if (!payload.schoolId || payload.schoolId === '') {
      delete payload.schoolId;
    }
    createMutation.mutate(payload);
  };

  const handleEditClick = (user: UserDto) => {
    setEditingUserId(user.id);
    editForm.setFieldsValue({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      campusId: user.campus?.id,
      schoolId: user.school?.id
    });
    setIsEditModalVisible(true);
  };

  const handleUpdate = (values: any) => {
    const payload = { ...values };
    delete payload.role; // Role không được phép thay đổi
    if (!payload.campusId || payload.campusId === '') {
      delete payload.campusId;
    }
    if (!payload.schoolId || payload.schoolId === '') {
      delete payload.schoolId;
    }
    if (!payload.password) {
      delete payload.password;
    }
    if (editingUserId) {
      updateMutation.mutate({ id: editingUserId, payload });
    }
  };

  const columns = [
    {
      title: 'Tài khoản',
      dataIndex: 'username',
      key: 'username',
      render: (text: string, record: UserDto) => (
        <Space>
          <UserOutlined className="text-[var(--color-primary)]" />
          <span className="text-white font-medium">{text}</span>
          {!record.isActive && <Tag color="error">Bị khóa</Tag>}
        </Space>
      )
    },
    {
      title: 'Họ tên',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text: string) => <span className="text-gray-300">{text}</span>
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text: string) => <span className="text-gray-400">{text}</span>
    },
    {
      title: 'Vai trò (Role)',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        let color = 'blue';
        if (role === 'SUPER_ADMIN') color = 'purple';
        else if (role === 'TEACHER') color = 'green';
        return (
          <Tag color={color} className="border-0 font-bold">
            {role}
          </Tag>
        );
      }
    },
    {
      title: 'Phạm vi Quản lý',
      key: 'scope',
      render: (_: any, record: UserDto) => {
        if (record.role === 'SUPER_ADMIN') return <span className="text-purple-400">Toàn hệ thống</span>;
        if (record.campus) return <span className="text-blue-400">{record.campus.name}</span>;
        if (record.school) return <span className="text-blue-300">Toàn trường ({record.school.name})</span>;
        return <span className="text-gray-500">Chưa phân bổ</span>;
      }
    },
    {
      title: 'Đăng nhập cuối',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (text: string) => <span className="text-gray-500">{text ? new Date(text).toLocaleString() : 'Chưa đăng nhập'}</span>
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: UserDto) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            className="text-blue-400 hover:text-blue-300"
            onClick={() => handleEditClick(record)} 
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => {
              Modal.confirm({
                title: 'Xóa tài khoản?',
                content: `Bạn có chắc chắn muốn xóa tài khoản ${record.username}? Hành động này không thể hoàn tác.`,
                okText: 'Xóa',
                okType: 'danger',
                cancelText: 'Hủy',
                onOk: () => deleteMutation.mutate(record.id)
              });
            }}
          />
        </Space>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!m-0 !text-white">Quản lý Tài khoản (User Admin)</Title>
          <p className="text-gray-400 mt-1">Tạo và phân quyền cho các Admin cơ sở (IT_ADMIN) và Giáo viên (TEACHER)</p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          className="bg-[var(--color-primary)] border-0 h-10 px-6 font-medium"
          onClick={() => setIsModalVisible(true)}
        >
          Tạo tài khoản mới
        </Button>
      </div>

      <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg">
        <div className="flex flex-wrap gap-4 mb-6">
          <Input 
            placeholder="Tìm kiếm tài khoản, email..." 
            prefix={<SearchOutlined className="text-gray-500" />}
            className="max-w-md bg-[#1f2028] border-[#2e303a] text-white hover:border-gray-500 focus:border-[var(--color-primary)]"
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <Table 
          columns={columns} 
          dataSource={data?.content || []} 
          loading={isLoading}
          rowKey="id"
          pagination={{ 
            current: page + 1,
            pageSize: 10,
            total: data?.totalElements || 0,
            onChange: (p) => setPage(p - 1),
            className: 'custom-pagination' 
          }}
          className="custom-dark-table"
        />
      </Card>

      <Modal
        title="Tạo Tài khoản mới"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        className="dark-modal"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} className="mt-4">
          <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="fullName" label="Họ và Tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]} initialValue="IT_ADMIN">
            <Select>
              <Select.Option value="SUPER_ADMIN">SUPER_ADMIN (Toàn quyền)</Select.Option>
              <Select.Option value="IT_ADMIN">IT_ADMIN (Quản trị Cơ sở)</Select.Option>
              <Select.Option value="TEACHER">TEACHER (Giáo viên)</Select.Option>
            </Select>
          </Form.Item>
          
          {/* Chọn Trường và Cơ sở dựa trên Role */}
          <Form.Item noStyle dependencies={['role']}>
            {({ getFieldValue }) => {
              const role = getFieldValue('role');
              if (role === 'IT_ADMIN') {
                return (
                  <div className="p-4 bg-[#1f2028] border border-[#2e303a] rounded-lg mb-4 mt-2">
                    <p className="text-gray-300 mb-4 text-sm">Phân bổ quyền quản lý cho Admin cơ sở (IT_ADMIN)</p>
                    
                    <Form.Item name="campusId" label="Khu vực (Campus) (Bắt buộc)" rules={[{ required: true, message: 'Vui lòng chọn khu vực' }]}>
                      <Select placeholder="-- Chọn Khu vực --">
                        {campusesData?.map((campus: any) => (
                          <Select.Option key={campus.id} value={campus.id}>{campus.name}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                );
              }
              if (role === 'TEACHER') {
                return (
                  <div className="p-4 bg-[#1f2028] border border-[#2e303a] rounded-lg mb-4 mt-2">
                    <p className="text-gray-300 mb-4 text-sm">Phân bổ Giáo viên (TEACHER) về Trường</p>
                    
                    <Form.Item name="schoolId" label="Trường học (School) (Bắt buộc)" rules={[{ required: true, message: 'Vui lòng chọn trường' }]}>
                      <Select placeholder="-- Chọn Trường --">
                        {schoolsData?.content?.map((school: any) => (
                          <Select.Option key={school.id} value={school.id}>{school.name}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                );
              }
              return null;
            }}
          </Form.Item>

          <Button type="primary" htmlType="submit" className="w-full bg-[var(--color-primary)] border-0" loading={createMutation.isPending}>
            Tạo tài khoản
          </Button>
        </Form>
      </Modal>

      <Modal
        title="Chỉnh sửa Tài khoản"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setEditingUserId(null);
          editForm.resetFields();
        }}
        footer={null}
        className="dark-modal"
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate} className="mt-4">
          <Form.Item name="fullName" label="Họ và Tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu (Bỏ trống nếu không đổi)" rules={[{ min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select disabled>
              <Select.Option value="SUPER_ADMIN">SUPER_ADMIN (Toàn quyền)</Select.Option>
              <Select.Option value="IT_ADMIN">IT_ADMIN (Quản trị Cơ sở)</Select.Option>
              <Select.Option value="TEACHER">TEACHER (Giáo viên)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="isActive" label="Trạng thái">
            <Select>
              <Select.Option value={true}>Hoạt động</Select.Option>
              <Select.Option value={false}>Bị khóa</Select.Option>
            </Select>
          </Form.Item>
          
          {/* Chọn Trường và Cơ sở dựa trên Role */}
          <Form.Item noStyle dependencies={['role']}>
            {({ getFieldValue }) => {
              const role = getFieldValue('role');
              if (role === 'IT_ADMIN') {
                return (
                  <div className="p-4 bg-[#1f2028] border border-[#2e303a] rounded-lg mb-4 mt-2">
                    <p className="text-gray-300 mb-4 text-sm">Phân bổ quyền quản lý cho Admin cơ sở (IT_ADMIN)</p>
                    <Form.Item name="campusId" label="Khu vực (Campus) (Bắt buộc)" rules={[{ required: true, message: 'Vui lòng chọn khu vực' }]}>
                      <Select placeholder="-- Chọn Khu vực --">
                        {campusesData?.map((campus: any) => (
                          <Select.Option key={campus.id} value={campus.id}>{campus.name}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                );
              }
              if (role === 'TEACHER') {
                return (
                  <div className="p-4 bg-[#1f2028] border border-[#2e303a] rounded-lg mb-4 mt-2">
                    <p className="text-gray-300 mb-4 text-sm">Phân bổ Giáo viên (TEACHER) về Trường</p>
                    <Form.Item name="schoolId" label="Trường học (School) (Bắt buộc)" rules={[{ required: true, message: 'Vui lòng chọn trường' }]}>
                      <Select placeholder="-- Chọn Trường --">
                        {schoolsData?.content?.map((school: any) => (
                          <Select.Option key={school.id} value={school.id}>{school.name}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                );
              }
              return null;
            }}
          </Form.Item>

          <Button type="primary" htmlType="submit" className="w-full bg-[var(--color-primary)] border-0" loading={updateMutation.isPending}>
            Lưu thay đổi
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default UserListPage;
