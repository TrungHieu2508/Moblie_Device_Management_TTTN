import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Card, Typography, message, Space, Popconfirm, Select } from 'antd';
import { PlusOutlined, BookOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSchools, getClassrooms, createClassroom, updateClassroom, deleteClassroom, getAllCampuses } from '../../../services/schoolService';
import { useAuthStore } from '../../../store/authStore';

const { Title } = Typography;

const ClassroomListPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const role = user?.role;

  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(() => localStorage.getItem('lastSelectedCampusId'));
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(() => { if (role !== 'SUPER_ADMIN') return user?.schoolId || null; return localStorage.getItem('lastSelectedSchoolId'); });
  useEffect(() => { if (selectedCampusId) localStorage.setItem('lastSelectedCampusId', selectedCampusId); else localStorage.removeItem('lastSelectedCampusId'); }, [selectedCampusId]);
  useEffect(() => { if (selectedSchoolId) localStorage.setItem('lastSelectedSchoolId', selectedSchoolId); else localStorage.removeItem('lastSelectedSchoolId'); }, [selectedSchoolId]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form] = Form.useForm();

  // Fetch Campuses if SUPER_ADMIN
  const { data: campusesData } = useQuery({
    queryKey: ['campuses'],
    queryFn: () => getAllCampuses(),
    enabled: role === 'SUPER_ADMIN'
  });

  // Fetch Schools for Dropdown (if Super Admin or IT Admin can select)
  const { data: schoolsData, isLoading: isLoadingSchools } = useQuery({
    queryKey: ['schools', { size: 100, campusId: selectedCampusId }],
    queryFn: () => getSchools({ page: 0, size: 100, campusId: selectedCampusId || undefined }),
    enabled: role !== 'TEACHER'
  });
  const schools = schoolsData?.content || [];

  // If role is SUPER_ADMIN, set initial selected school to the first one available
  useEffect(() => {
    if (role === 'SUPER_ADMIN' && !selectedSchoolId && schools.length > 0) {
      const savedSchoolId = localStorage.getItem('lastSelectedSchoolId');
      const exists = savedSchoolId && schools.some((s: any) => s.id === savedSchoolId);
      if (!exists) setSelectedSchoolId(schools[0].id);
    }
  }, [schools, role, selectedSchoolId]);

  // Fetch Classrooms for the selected school
  const { data: classrooms = [], isLoading } = useQuery({
    queryKey: ['classrooms', selectedSchoolId],
    queryFn: () => getClassrooms(selectedSchoolId as string),
    enabled: !!selectedSchoolId
  });

  const mutationCreate = useMutation({
    mutationFn: (data: { name: string, code: string, schoolId: string }) => createClassroom(data.schoolId, data),
    onSuccess: () => {
      message.success('Đã thêm lớp học mới!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['classrooms', selectedSchoolId] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Không thể tạo lớp học';
      message.error(errorMsg);
    }
  });

  const mutationUpdate = useMutation({
    mutationFn: (data: { id: string, name: string, code: string, schoolId?: string }) => updateClassroom(data.id, { name: data.name, code: data.code }),
    onSuccess: () => {
      message.success('Đã cập nhật lớp học!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['classrooms', selectedSchoolId] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Không thể cập nhật lớp học';
      message.error(errorMsg);
    }
  });

  const mutationDelete = useMutation({
    mutationFn: deleteClassroom,
    onSuccess: () => {
      message.success('Đã xóa lớp học!');
      queryClient.invalidateQueries({ queryKey: ['classrooms', selectedSchoolId] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Không thể xóa lớp học';
      message.error(errorMsg);
    }
  });

  const handleModalClose = () => {
    setIsModalVisible(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      schoolId: record.schoolId,
    });
    setIsModalVisible(true);
  };

  const columns = [
    {
      title: 'Tên Lớp Học',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <BookOutlined className="text-[var(--color-primary)]" />
          <span className="text-white font-medium">{text}</span>
        </Space>
      )
    },
    { title: 'Mã Lớp', dataIndex: 'code', key: 'code', render: (text: string) => <span className="text-gray-400">{text}</span> },
    {
      title: 'Trường học',
      dataIndex: 'schoolName',
      key: 'schoolName',
      render: (text: string) => <span className="text-gray-300">{text || 'N/A'}</span>
    },
    {
      title: 'Khu vực (Campus)',
      dataIndex: 'campusName',
      key: 'campusName',
      render: (text: string) => <span className="text-gray-400">{text || 'N/A'}</span>
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            className="text-blue-400 hover:text-blue-300"
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Xóa lớp học"
            description="Bạn có chắc chắn muốn xóa lớp học này? (Cần đảm bảo không còn thiết bị nào thuộc lớp này)"
            onConfirm={() => mutationDelete.mutate(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              className="hover:bg-red-500/10"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="h-full w-full relative flex flex-col p-6">
      <div className="flex justify-between items-center mb-6 z-10">
        <div>
          <Title level={3} className="!m-0 !text-white">Quản Lý Lớp Học</Title>
          <p className="text-gray-400 mt-1">Danh sách và thông tin lớp học</p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => {
            if (selectedSchoolId) {
              form.setFieldsValue({ schoolId: selectedSchoolId });
            }
            setIsModalVisible(true);
          }}
          className="bg-[var(--color-primary)] border-none hover:opacity-90 h-10 px-6 rounded-lg shadow-lg shadow-indigo-500/20"
        >
          Thêm Lớp Học
        </Button>
      </div>

      <Card className="flex-1 bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg body-no-padding overflow-hidden flex flex-col">
        {role !== 'TEACHER' && (
          <div className="p-4 border-b border-[#2e303a] flex flex-wrap items-center gap-4">
            {role === 'SUPER_ADMIN' && (
              <Space>
                <span className="text-gray-300 whitespace-nowrap">Khu vực:</span>
                <Select
                  allowClear
                  placeholder="Chọn khu vực"
                  className="w-48 custom-select"
                  value={selectedCampusId}
                  onChange={(val) => {
                    setSelectedCampusId(val);
                    setSelectedSchoolId(null);
                  }}
                  options={campusesData?.map((c: any) => ({ value: c.id, label: c.name })) || []}
                />
              </Space>
            )}
            <Space className="w-full sm:w-auto">
              <span className="text-gray-300 whitespace-nowrap">Trường học:</span>
              <Select
                placeholder="Chọn trường học"
                className="w-80 custom-select"
                value={selectedSchoolId}
                onChange={setSelectedSchoolId}
                options={schools.map((s: any) => ({ value: s.id, label: s.name }))}
                loading={isLoadingSchools}
                disabled={role === 'SUPER_ADMIN' && !selectedCampusId && schools.length === 0}
              />
            </Space>
          </div>
        )}
        
        <Table 
          columns={columns} 
          dataSource={classrooms} 
          rowKey="id"
          loading={isLoading}
          pagination={false}
          className="custom-table flex-1 overflow-auto"
        />
      </Card>

      <Modal
        title={editingId ? 'Cập Nhật Lớp Học' : 'Thêm Lớp Học Mới'}
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={null}
        className="dark-modal"
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-4"
          onFinish={(values) => {
            if (editingId) {
              mutationUpdate.mutate({ id: editingId, ...values });
            } else {
              mutationCreate.mutate(values);
            }
          }}
        >
          {role !== 'TEACHER' && (
            <Form.Item 
              name="schoolId" 
              label={<span className="text-gray-300">Trường học</span>} 
              rules={[{ required: true, message: 'Vui lòng chọn trường học' }]}
            >
              <Select
                placeholder="Chọn trường học"
                className="custom-select"
                options={schools.map((s: any) => ({ value: s.id, label: s.name }))}
                disabled={editingId !== null} // Cấm sửa trường khi đang update lớp
              />
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label={<span className="text-gray-300">Tên Lớp Học</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên lớp học!' }]}
          >
            <Input className="bg-[#1f2028] border-[#2e303a] text-white hover:border-[var(--color-primary)] focus:border-[var(--color-primary)]" placeholder="Ví dụ: 10A1" />
          </Form.Item>
          
          <Form.Item
            name="code"
            label={<span className="text-gray-300">Mã Lớp Học</span>}
            rules={[{ required: true, message: 'Vui lòng nhập mã lớp học!' }]}
          >
            <Input className="bg-[#1f2028] border-[#2e303a] text-white hover:border-[var(--color-primary)] focus:border-[var(--color-primary)]" placeholder="Ví dụ: 10A1_2023" />
          </Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            className="w-full bg-[var(--color-primary)] border-0 mt-2" 
            loading={mutationCreate.isPending || mutationUpdate.isPending}
          >
            {editingId ? 'Cập nhật Lớp học' : 'Thêm Lớp Học'}
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default ClassroomListPage;

