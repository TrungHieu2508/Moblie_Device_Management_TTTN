import { useState } from 'react';
import { Table, Button, Modal, Form, Input, Card, Typography, message, Space, Select, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, BankOutlined, EnvironmentOutlined, DeleteOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSchools, createSchool, getAllCampuses, deleteSchool, updateSchool } from '../../../services/schoolService';
import { useAuthStore } from '../../../store/authStore';
const { Title } = Typography;

const SchoolListPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { user } = useAuthStore();
  const role = user?.role;

  const [isSchoolModalVisible, setIsSchoolModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string | null>(null);
  
  const [schoolForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['schools', page, selectedCampusFilter],
    queryFn: () => getSchools({ page, size: 10, campusId: selectedCampusFilter || undefined }),
  });

  const createSchoolMutation = useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      message.success('Đã thêm trường học mới!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Không thể tạo trường học';
      message.error(errorMsg);
    }
  });

  const updateSchoolMutation = useMutation({
    mutationFn: (values: any) => updateSchool(editingId as string, values),
    onSuccess: () => {
      message.success('Đã cập nhật trường học!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Không thể cập nhật trường học';
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
    setEditingId(null);
    schoolForm.resetFields();
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    schoolForm.setFieldsValue({
      name: record.name,
      code: record.code,
      campusId: record.campusId,
      address: record.address,
    });
    setIsSchoolModalVisible(true);
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
              <Tooltip title="Sửa trường học">
                <Button 
                  type="text" 
                  icon={<EditOutlined />} 
                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  onClick={() => handleEdit(record)}
                />
              </Tooltip>
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

      <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg body-no-padding overflow-hidden flex flex-col">
        {role === 'SUPER_ADMIN' && (
          <div className="p-4 border-b border-[#2e303a] flex items-center justify-between">
            <Space>
              <span className="text-gray-300">Lọc theo Khu vực:</span>
              <Select
                allowClear
                placeholder="Tất cả Khu vực"
                className="w-64 custom-select"
                value={selectedCampusFilter}
                onChange={(val) => {
                  setSelectedCampusFilter(val);
                  setPage(0);
                }}
                options={campusesData?.map((c: any) => ({ value: c.id, label: c.name })) || []}
              />
            </Space>
          </div>
        )}
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
        title={editingId ? 'Cập nhật Trường học' : 'Thêm Trường học mới'} 
        open={isSchoolModalVisible} 
        onCancel={handleModalClose} 
        footer={null} 
        className="dark-modal"
      >
        <Form 
          form={schoolForm} 
          layout="vertical" 
          onFinish={(v) => {
            if (editingId) {
              updateSchoolMutation.mutate(v);
            } else {
              createSchoolMutation.mutate(v);
            }
          }} 
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
            loading={createSchoolMutation.isPending || updateSchoolMutation.isPending}
          >
            {editingId ? 'Cập nhật Trường học' : 'Tạo Trường học'}
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default SchoolListPage;
