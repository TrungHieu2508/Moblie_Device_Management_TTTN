import { useState } from 'react';
import { Table, Button, Modal, Form, Input, Card, Typography, message, Space, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, EnvironmentOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllCampuses, createCampus, deleteCampus, updateCampus } from '../../../services/schoolService';
const { Title } = Typography;

const CampusListPage = () => {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['campuses'],
    queryFn: () => getAllCampuses(),
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => createCampus(values),
    onSuccess: () => {
      message.success('Đã thêm khu vực/cơ sở mới!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['campuses'] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Không thể tạo khu vực/cơ sở';
      message.error(errorMsg);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => updateCampus(editingId as string, values),
    onSuccess: () => {
      message.success('Đã cập nhật khu vực/cơ sở!');
      handleModalClose();
      queryClient.invalidateQueries({ queryKey: ['campuses'] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Không thể cập nhật khu vực/cơ sở';
      message.error(errorMsg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCampus(id),
    onSuccess: () => {
      message.success('Đã xóa cơ sở thành công!');
      queryClient.invalidateQueries({ queryKey: ['campuses'] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Không thể xóa cơ sở này (Có thể do cơ sở đang chứa dữ liệu)';
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
      address: record.address,
    });
    setIsModalVisible(true);
  };

  const columns = [
    {
      title: 'Tên Khu vực/Cơ sở',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <EnvironmentOutlined className="text-blue-400" />
          <span className="text-white font-medium">{text}</span>
        </Space>
      )
    },
    { title: 'Mã (Code)', dataIndex: 'code', key: 'code', render: (text: string) => <span className="text-gray-400">{text}</span> },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address', render: (text: string) => <span className="text-gray-400">{text}</span> },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center' as const,
      width: 100,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Sửa cơ sở">
            <Button
              type="text"
              icon={<EditOutlined />}
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa cơ sở này?"
            description="Hành động này không thể hoàn tác."
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
          >
            <Tooltip title="Xóa cơ sở">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                className="hover:bg-red-500/10"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!m-0 !text-white">Quản lý Khu vực (Campus)</Title>
          <p className="text-gray-400 mt-1">Thêm và quản lý các khu vực địa lý (VD: Quận 1, Quận Gò Vấp...)</p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          className="bg-blue-600 border-0 h-10 px-6 font-medium"
          onClick={() => setIsModalVisible(true)}
        >
          Thêm Khu vực mới
        </Button>
      </div>

      <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg">
        <Table 
          columns={columns} 
          dataSource={data || []} 
          loading={isLoading}
          rowKey="id"
          pagination={{ pageSize: 10, className: 'custom-pagination' }}
          className="custom-dark-table"
        />
      </Card>

      <Modal
        title={editingId ? 'Cập nhật Khu vực (Campus)' : 'Thêm Khu vực (Campus) mới'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={handleModalClose}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        className="dark-modal"
        okText={editingId ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={(values) => {
          if (editingId) {
            updateMutation.mutate(values);
          } else {
            createMutation.mutate(values);
          }
        }} className="mt-4">
          <Form.Item name="name" label="Tên khu vực" rules={[{ required: true }]}><Input placeholder="VD: Quận Gò Vấp" /></Form.Item>
          <Form.Item name="code" label="Mã khu vực" rules={[{ required: true }]}><Input placeholder="VD: Q_GV" /></Form.Item>
          <Form.Item name="address" label="Địa chỉ" rules={[{ required: true }]}><Input /></Form.Item>
          <Button type="primary" htmlType="submit" className="w-full bg-blue-600 border-0" loading={createMutation.isPending}>Tạo Khu vực</Button>
        </Form>
      </Modal>
    </div>
  );
};

export default CampusListPage;
