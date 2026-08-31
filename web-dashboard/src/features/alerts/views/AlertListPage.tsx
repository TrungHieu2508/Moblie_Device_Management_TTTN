import { useState, useEffect } from 'react';
import { Table, Tag, Input, Select, Card, Typography, Space, Button } from 'antd';
import { SearchOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlerts, updateAlertStatus } from '../../../services/alertService';
import type { AlertDto } from '../../../services/alertService';

const { Title, Text } = Typography;

// Mock data replaced with real API call

const getSeverityTag = (severity: string) => {
  switch (severity) {
    case 'CRITICAL':
      return <Tag color="error" className="border-0 bg-red-500/20 text-red-400 font-bold px-3 py-1 rounded-full"><ExclamationCircleOutlined className="mr-1" /> NGHIÊM TRỌNG</Tag>;
    case 'WARNING':
      return <Tag color="warning" className="border-0 bg-yellow-500/20 text-yellow-400 font-medium px-3 py-1 rounded-full">Cảnh báo</Tag>;
    case 'INFO':
      return <Tag color="processing" className="border-0 bg-blue-500/20 text-blue-400 font-medium px-3 py-1 rounded-full">Thông tin</Tag>;
    default:
      return <Tag>{severity}</Tag>;
  }
};

const getStatusTag = (status: string) => {
  switch (status) {
    case 'NEW':
      return <Tag className="border-0 bg-gray-600/30 text-gray-300 rounded-full px-2"><ClockCircleOutlined className="mr-1" /> Mới</Tag>;
    case 'PROCESSING':
      return <Tag className="border-0 bg-blue-500/20 text-blue-400 rounded-full px-2"><ClockCircleOutlined className="mr-1 animate-spin" /> Đang xử lý</Tag>;
    case 'RESOLVED':
      return <Tag className="border-0 bg-green-500/20 text-green-400 rounded-full px-2"><CheckCircleOutlined className="mr-1" /> Đã giải quyết</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

const AlertListPage = () => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [campusFilter, setCampusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', page, statusFilter, campusFilter],
    queryFn: () => getAlerts({ 
      page, 
      size: 10, 
      status: statusFilter === 'all' ? undefined : statusFilter,
      campusId: campusFilter === 'all' ? undefined : campusFilter
    }),
  });

  // Real-time alert listener
  const { alertInfo } = useWebSocket();
  
  useEffect(() => {
    if (alertInfo) {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  }, [alertInfo, queryClient]);
  
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => updateAlertStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  });

  const columns = [
    {
      title: 'Mức độ',
      dataIndex: 'severity',
      key: 'severity',
      render: (text: string) => getSeverityTag(text),
      width: 150
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => <Text className="text-gray-400">{new Date(text).toLocaleString()}</Text>,
      width: 180
    },
    {
      title: 'Thiết bị',
      dataIndex: 'device',
      key: 'device',
      render: (device: any) => <Text className="text-white font-medium">{device?.deviceName || 'Unknown'}</Text>
    },
    {
      title: 'Vi phạm',
      dataIndex: 'rule',
      key: 'rule',
      render: (rule: any, record: AlertDto) => <Text className="text-[var(--color-primary)] font-medium">{rule?.name || record.title}</Text>
    },
    {
      title: 'Chi tiết',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => <Text className="text-gray-400">{text}</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (text: string) => getStatusTag(text),
      width: 140
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          {record.status === 'NEW' && (
            <Button 
              type="link" 
              className="text-blue-400 p-0 hover:text-blue-300"
              onClick={() => statusMutation.mutate({ id: record.id, status: 'PROCESSING' })}
              loading={statusMutation.isPending}
            >
              Nhận xử lý
            </Button>
          )}
          {record.status === 'PROCESSING' && (
            <Button 
              type="link" 
              className="text-green-400 p-0 hover:text-green-300"
              onClick={() => statusMutation.mutate({ id: record.id, status: 'RESOLVED' })}
              loading={statusMutation.isPending}
            >
              Hoàn thành
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!m-0 !text-white flex items-center gap-3">
            Trung tâm Cảnh báo
            {alertInfo && <Tag color="error" className="animate-pulse border-0">Có cảnh báo mới!</Tag>}
          </Title>
          <p className="text-gray-400 mt-1">Giám sát các hành vi vi phạm chính sách của học sinh</p>
        </div>
      </div>

      <Card className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg">
        <div className="flex flex-wrap gap-4 mb-6">
          <Input 
            placeholder="Tìm kiếm theo tên thiết bị, vi phạm..." 
            prefix={<SearchOutlined className="text-gray-500" />}
            className="max-w-md bg-[#1f2028] border-[#2e303a] text-white hover:border-gray-500 focus:border-[var(--color-primary)]"
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Select
            defaultValue="all"
            className="w-40"
            options={[
              { value: 'all', label: 'Mọi mức độ' },
              { value: 'CRITICAL', label: 'Nghiêm trọng' },
              { value: 'WARNING', label: 'Cảnh báo' },
            ]}
          />
          <Select
            defaultValue="all"
            className="w-40"
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: 'all', label: 'Mọi trạng thái' },
              { value: 'NEW', label: 'Mới' },
              { value: 'PROCESSING', label: 'Đang xử lý' },
              { value: 'RESOLVED', label: 'Đã giải quyết' },
            ]}
          />
          <Select
            defaultValue="all"
            className="w-48"
            onChange={(value) => setCampusFilter(value)}
            options={[
              { value: 'all', label: 'Tất cả Cơ sở' },
              { value: 'campus-id-1', label: 'Cơ sở 1 (Demo)' },
              { value: 'campus-id-2', label: 'Cơ sở 2 (Demo)' },
            ]}
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
    </div>
  );
};

export default AlertListPage;
