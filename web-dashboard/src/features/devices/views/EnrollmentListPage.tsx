import { useState } from 'react';
import { Table, Card, Typography, Button, message, Modal, QRCode, Form, Select, Input, Popconfirm } from 'antd';
import { CopyOutlined, QrcodeOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import axiosInstance, { API_BASE_URL } from '../../../config/axios';
import { getAllCampuses, getSchools, getClassrooms } from '../../../services/schoolService';
import { createEnrollmentProfile, deleteEnrollmentProfile } from '../../../services/enrollmentService';

const { Title, Text } = Typography;

const EnrollmentListPage = () => {
  const queryClient = useQueryClient();

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['enrollments'],
    queryFn: async () => {
      const res = await axiosInstance.get('/enrollments');
      return res.data?.data || [];
    }
  });

  const { data: campuses } = useQuery({
    queryKey: ['campuses'],
    queryFn: getAllCampuses,
  });

  const { data: schoolsData } = useQuery({
    queryKey: ['schools', { size: 100 }],
    queryFn: () => getSchools({ page: 0, size: 100 }),
  });
  const schools = schoolsData?.content || [];

  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedCode, setSelectedCode] = useState('');
  
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [registerForm] = Form.useForm();
  const selectedCampusIdForForm = Form.useWatch('campusId', registerForm);
  const selectedSchoolIdForForm = Form.useWatch('schoolId', registerForm);

  const { data: classrooms = [], isLoading: isClassroomsLoading } = useQuery({
    queryKey: ['classrooms', selectedSchoolIdForForm],
    queryFn: () => getClassrooms(selectedSchoolIdForForm),
    enabled: !!selectedSchoolIdForForm
  });

  const createEnrollmentMutation = useMutation({
    mutationFn: createEnrollmentProfile,
    onSuccess: (data) => {
      message.success('Tạo Mã ghi danh thành công!');
      setCreatedCode(data.code);
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      registerForm.resetFields();
    },
    onError: () => message.error('Có lỗi xảy ra khi tạo mã')
  });

  const deleteEnrollmentMutation = useMutation({
    mutationFn: deleteEnrollmentProfile,
    onSuccess: () => {
      message.success('Xóa mã ghi danh thành công!');
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: () => message.error('Có lỗi xảy ra khi xóa mã')
  });

  const handleCreateCode = (values: any) => {
    createEnrollmentMutation.mutate(values);
  };

  const columns = [
    {
      title: 'Mã Ghi Danh / QR',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => (
        <div className="flex items-center gap-3">
          <div className="bg-[var(--color-primary)]/10 px-3 py-1 rounded border border-[var(--color-primary)]/30">
            <span className="font-mono text-lg text-[var(--color-primary)] font-bold tracking-wider">{text}</span>
          </div>
          <Button 
            type="text" 
            className="text-gray-400 hover:text-white" 
            icon={<QrcodeOutlined className="text-xl" />}
            onClick={() => {
              setSelectedCode(text);
              setQrModalVisible(true);
            }}
          />
        </div>
      ),
    },
    {
      title: 'Trường học',
      dataIndex: 'schoolName',
      key: 'schoolName',
      render: (text: string) => <Text className="text-white font-medium">{text || '---'}</Text>,
    },
    {
      title: 'Cơ sở',
      dataIndex: 'campusName',
      key: 'campusName',
      render: (text: string) => <Text className="text-gray-300">{text || '---'}</Text>,
    },
    {
      title: 'Lớp học',
      dataIndex: 'classroomName',
      key: 'classroomName',
      render: (text: string) => <Text className="text-gray-300">{text || '---'}</Text>,
    },
    {
      title: 'Ngày hết hạn',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (text: string) => (
        <Text className="text-gray-400">
          {new Date(text).toLocaleDateString('vi-VN')} {new Date(text).toLocaleTimeString('vi-VN')}
        </Text>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <div className="flex gap-2">
          <Button 
            type="primary" 
            ghost 
            size="small"
            className="!text-white" 
            icon={<CopyOutlined />}
            onClick={() => {
              navigator.clipboard.writeText(record.code);
              message.success('Đã copy mã ghi danh!');
            }}
          >
            Copy
          </Button>
          <Popconfirm
            title="Xóa mã ghi danh này?"
            description="Bạn có chắc chắn muốn xóa mã ghi danh này không? Các thiết bị đã quét mã sẽ không bị ảnh hưởng."
            onConfirm={() => deleteEnrollmentMutation.mutate(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true, loading: deleteEnrollmentMutation.isPending }}
          >
            <Button 
              danger 
              size="small" 
              icon={<DeleteOutlined />}
            >
              Xóa
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!m-0 !text-white flex items-center gap-3">
            Quản lý Mã Ghi Danh
          </Title>
          <p className="text-gray-400 mt-1">
            Mỗi mã ghi danh có thể dùng cho nhiều thiết bị khác nhau tại cùng một Cơ sở/Trường học. 
            Bạn không cần tạo mã mới cho từng thiết bị!
          </p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          className="bg-[var(--color-primary)] border-0 h-10 px-6 font-medium"
          onClick={() => {
            setCreatedCode(null);
            setIsRegisterModalVisible(true);
          }}
        >
          Tạo Mã Ghi Danh Mới
        </Button>
      </div>

      <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg">
        <Table 
          columns={columns} 
          dataSource={enrollments} 
          loading={isLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          className="custom-dark-table"
        />
      </Card>

      <Modal
        title="Mã QR Ghi Danh"
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={null}
        centered
        width={350}
        styles={{ body: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' } }}
      >
        <QRCode 
          value={JSON.stringify({ 
            serverUrl: API_BASE_URL.replace('/api', ''),
            code: selectedCode 
          })} 
          size={250} 
          bordered={false} 
          color="#000000" 
          bgColor="#FFFFFF" 
        />
        <div className="mt-4 text-center">
          <Text className="text-gray-500">Mã thiết bị / Ghi danh:</Text>
          <Title level={4} className="!mt-1 !mb-0 font-mono text-[var(--color-primary)]">{selectedCode}</Title>
        </div>
        <Text className="text-gray-400 mt-2 text-center text-sm">
          Sử dụng ứng dụng MDM Agent trên thiết bị học sinh để quét mã này.
        </Text>
      </Modal>

      {/* Modal Tạo Mã Ghi Danh */}
      <Modal
        title="Tạo Mã Ghi Danh (Enrollment Code)"
        open={isRegisterModalVisible}
        onCancel={() => setIsRegisterModalVisible(false)}
        footer={null}
        className="dark-modal"
      >
        {createdCode ? (
          <div className="text-center py-8">
            <Typography.Text className="text-gray-400 block mb-2">Quét mã QR dưới đây để cấu hình thiết bị:</Typography.Text>
            
            <div className="flex justify-center my-6 bg-white p-4 rounded-xl inline-block">
              <QRCodeSVG 
                value={JSON.stringify({ 
                  serverUrl: API_BASE_URL.replace('/api', ''),
                  code: createdCode 
                })} 
                size={200}
                level="M"
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
            </div>
            
            <Typography.Text className="text-gray-400 block mb-2">Hoặc nhập thủ công mã Ghi Danh sau:</Typography.Text>
            <Typography.Title level={2} className="!text-[var(--color-primary)] tracking-widest bg-[var(--color-primary)]/10 py-4 rounded-xl border border-[var(--color-primary)]/30">
              {createdCode}
            </Typography.Title>
            <Typography.Text className="text-gray-400 block mt-4">
              Mã này sẽ tự động cấu hình Server URL và đưa thiết bị vào hệ thống với thông tin Cơ sở và Trường học đã chọn.
            </Typography.Text>
            <Button type="primary" className="mt-6 w-full" onClick={() => setIsRegisterModalVisible(false)}>
              Đóng
            </Button>
          </div>
        ) : (
          <Form form={registerForm} layout="vertical" onFinish={handleCreateCode} className="mt-4">
            <Form.Item name="campusId" label="Cơ sở (Campus)" rules={[{ required: true, message: 'Vui lòng chọn cơ sở' }]}>
              <Select 
                placeholder="Chọn cơ sở"
                onChange={() => registerForm.setFieldValue('schoolId', undefined)}
              >
                {campuses?.map((campus: any) => (
                  <Select.Option key={campus.id} value={campus.id}>{campus.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="schoolId" label="Trường học" rules={[{ required: true, message: 'Vui lòng chọn trường học' }]}>
              <Select placeholder="Chọn trường học" disabled={!selectedCampusIdForForm}>
                {schools
                  .filter((school: any) => school.campusId === selectedCampusIdForForm)
                  .map((school: any) => (
                  <Select.Option key={school.id} value={school.id}>{school.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item name="classroomId" label="Lớp học (Tùy chọn)">
              <Select placeholder="Chọn lớp học (nếu có)" disabled={!selectedSchoolIdForForm} loading={isClassroomsLoading}>
                {classrooms?.map((classroom: any) => (
                  <Select.Option key={classroom.id} value={classroom.id}>{classroom.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="expiresInDays" label="Số ngày hiệu lực" initialValue={7}>
              <Input type="number" min={1} max={30} suffix="Ngày" />
            </Form.Item>
            
            <Button type="primary" htmlType="submit" className="w-full bg-[var(--color-primary)] border-0 mt-4" loading={createEnrollmentMutation.isPending}>
              Tạo Mã Mới
            </Button>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default EnrollmentListPage;
