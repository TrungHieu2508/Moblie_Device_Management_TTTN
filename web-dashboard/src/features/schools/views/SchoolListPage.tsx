import { useState } from 'react';
import { Table, Button, Modal, Form, Input, Card, Typography, message, Space, Select, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, BankOutlined, EnvironmentOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSchools, createSchool, getAllCampuses, deleteSchool } from '../../../services/schoolService';
import { useAuthStore } from '../../../store/authStore';
const { Title } = Typography;

const SchoolListPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { user } = useAuthStore();
  const role = user?.role;

  const [isSchoolModalVisible, setIsSchoolModalVisible] = useState(false);

  
  const [schoolForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['schools', page],
    queryFn: () => getSchools({ page, size: 10 }),
  });

  const createSchoolMutation = useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      message.success('Đã thêm trường học mới!');
      setIsSchoolModalVisible(false);
      schoolForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Không thể tạo trường học';
      message.error(errorMsg);
    }
  });



  const deleteSchoolMutation = useMutation({
    mutationFn: deleteSchool,
    onSuccess: () => {
      message.success('Đã xóa trường học!');
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Không thể xóa trường học';
      message.error(errorMsg);
    }
  });



  const handleModalClose = () => {
    setIsSchoolModalVisible(false);
    schoolForm.resetFields();
  };

  const { data: campusesData } = useQuery({
    queryKey: ['campuses'],
    queryFn: () => getAllCampuses(),
  });

  const columns = [
    {
      title: 'Tên Trường',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <BankOutlined className="text-[var(--color-primary)]" />
          <span className="text-white font-medium">{text}</span>
        </Space>
      )
    },
    { title: 'Mã', dataIndex: 'code', key: 'code', render: (text: string) => <span className="text-gray-400">{text}</span> },
    {
      title: 'Khu vực (Campus)',
      dataIndex: 'campusName',
      key: 'campusName',
      render: (text: string) => (
        <Space>
          <EnvironmentOutlined className="text-blue-400" />
          <span className="text-gray-300">{text || 'N/A'}</span>
        </Space>
      )
    },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address', render: (text: string) => <span className="text-gray-400">{text}</span> },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Tooltip title="Vào xem Dashboard của Trường">
            <Button 
              type="primary" 
              ghost
              icon={<EyeOutlined />} 
              onClick={() => navigate(`/schools/${record.id}/dashboard`)}
            >
              Xem Trường
            </Button>
          </Tooltip>
          {role === 'SUPER_ADMIN' && (
            <>

              <Popconfirm
                title="Xóa trường học"
                description="Bạn có chắc chắn muốn xóa trường học này không?"
                onConfirm={() => deleteSchoolMutation.mutate(record.id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true, loading: deleteSchoolMutation.isPending }}
              >
                <Tooltip title="Xóa">
                  <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />} 
                  />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!m-0 !text-white">Quản lý Hệ thống Trường học</Title>
          <p className="text-gray-400 mt-1">{role === 'SUPER_ADMIN' ? 'Thêm và phân bổ các Cơ sở trực thuộc Trường' : 'Danh sách các Trường học thuộc Cơ sở của bạn'}</p>
        </div>
        {role === 'SUPER_ADMIN' && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="bg-[var(--color-primary)] border-0 h-10 px-6 font-medium"
            onClick={() => {
              schoolForm.resetFields();
              setIsSchoolModalVisible(true);
            }}
          >
            Thêm Trường mới
          </Button>
        )}
      </div>

      <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg">
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

      {/* Modal Thêm Trường */}
      <Modal 
        title="Thêm Trường học" 
        open={isSchoolModalVisible} 
        onCancel={handleModalClose} 
        footer={null} 
        className="dark-modal"
      >
        <Form 
          form={schoolForm} 
          layout="vertical" 
          onFinish={(v) => createSchoolMutation.mutate(v)} 
          className="mt-4"
        >
          <Form.Item name="campusId" label="Khu vực (Campus)" rules={[{ required: true, message: 'Vui lòng chọn khu vực' }]}>
            <Select 
              showSearch 
              placeholder="Chọn khu vực" 
              optionFilterProp="children"
              filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
            >
              {campusesData?.map(campus => (
                <Select.Option key={campus.id} value={campus.id}>{campus.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="name" label="Tên trường" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="code" label="Mã trường" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="address" label="Địa chỉ" rules={[{ required: true }]}><Input /></Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            className="w-full bg-[var(--color-primary)] border-0" 
            loading={createSchoolMutation.isPending}
          >
            Tạo Trường học
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default SchoolListPage;
