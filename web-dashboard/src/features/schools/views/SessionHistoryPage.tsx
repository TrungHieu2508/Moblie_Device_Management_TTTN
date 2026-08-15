import React from 'react';
import { Typography, Table, Tag, Select, Space } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { getHistorySessions } from '../../../services/classSessionService';
import { getSchools, getAllCampuses } from '../../../services/schoolService';
import { useAuthStore } from '../../../store/authStore';

const { Title, Text } = Typography;

const SessionHistoryPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;
  const isSuperOrITAdmin = role === 'SUPER_ADMIN' || role === 'IT_ADMIN';

  const [selectedCampusId, setSelectedCampusId] = useState<string | undefined>(undefined);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>(undefined);

  // Lấy danh sách khu vực (chỉ cần thiết cho SUPER_ADMIN)
  const { data: campuses = [] } = useQuery({
    queryKey: ['campuses'],
    queryFn: getAllCampuses,
    enabled: role === 'SUPER_ADMIN'
  });

  // Lấy danh sách trường học nếu là admin
  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: () => getSchools({ page: 0, size: 100 }),
    enabled: isSuperOrITAdmin
  });

  const schools = useMemo(() => {
    let list = schoolsData?.content || [];
    if (selectedCampusId) {
      list = list.filter((s: any) => s.campusId === selectedCampusId);
    }
    return list;
  }, [schoolsData, selectedCampusId]);

  // IT_ADMIN bắt buộc phải có schoolId, SUPER_ADMIN có thể xem tất cả
  useEffect(() => {
    if (role === 'IT_ADMIN' && schools.length > 0 && !selectedSchoolId) {
      setSelectedSchoolId(schools[0].id);
    }
  }, [role, schools, selectedSchoolId]);

  // Nếu chọn khu vực khác, reset lại lựa chọn trường học
  useEffect(() => {
    if (role === 'SUPER_ADMIN') {
      setSelectedSchoolId(undefined);
    }
  }, [selectedCampusId, role]);

  const shouldFetchHistory = role === 'SUPER_ADMIN' || role === 'TEACHER' || (role === 'IT_ADMIN' && !!selectedSchoolId);

  const { data: historySessions = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ['historySessions', selectedSchoolId],
    queryFn: () => getHistorySessions(selectedSchoolId),
    refetchInterval: 60000, // Poll every 60s
    enabled: shouldFetchHistory
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Title level={3} className="!m-0 !text-white flex items-center gap-4">
            Lịch sử buổi học
          </Title>
          <Text className="text-gray-400">Xem lại danh sách các lớp học đã kết thúc hoặc đã hủy</Text>
        </div>
        {isSuperOrITAdmin && (
          <Space className="flex-wrap justify-end">
            {role === 'SUPER_ADMIN' && (
              <Space>
                <Text className="text-gray-300">Cơ sở:</Text>
                <Select
                  placeholder="Tất cả cơ sở"
                  allowClear
                  value={selectedCampusId}
                  onChange={setSelectedCampusId}
                  style={{ minWidth: 200 }}
                  options={campuses.map((c: any) => ({ label: c.name, value: c.id }))}
                />
              </Space>
            )}
            <Space>
              <Text className="text-gray-300">Trường học:</Text>
              <Select
                placeholder={role === 'SUPER_ADMIN' ? "Tất cả trường" : "Chọn trường"}
                allowClear={role === 'SUPER_ADMIN'}
                value={selectedSchoolId}
                onChange={setSelectedSchoolId}
                style={{ minWidth: 250 }}
                options={schools.map((s: any) => ({ label: s.name, value: s.id }))}
                loading={!schoolsData}
                disabled={role === 'SUPER_ADMIN' && !selectedCampusId && schools.length > 0} // Tuỳ chọn: có thể disable nếu chưa chọn campus, nhưng hiện tại cho phép lọc tất cả
              />
            </Space>
          </Space>
        )}
      </div>

      <div className="bg-[#1f2028] p-6 rounded-xl border border-[#2e303a]">
        <Table
          dataSource={historySessions}
          rowKey="id"
          loading={isHistoryLoading}
          pagination={{ pageSize: 10 }}
          className="dark-table"
          columns={[
            { title: 'Tên lớp', dataIndex: 'classroomName', key: 'classroomName' },
            { 
              title: 'Thời gian', 
              key: 'time',
              render: (_, record: any) => (
                <Text className="text-gray-400">
                  {record.startedAt ? new Date(record.startedAt).toLocaleString() : (record.scheduledStartTime ? new Date(record.scheduledStartTime).toLocaleString() : '')} 
                  {' - '} 
                  {record.endedAt ? new Date(record.endedAt).toLocaleTimeString() : 'N/A'}
                </Text>
              )
            },
            { 
              title: 'Trạng thái', 
              dataIndex: 'status', 
              key: 'status',
              render: (status: string) => (
                <Tag color={status === 'ENDED' ? 'default' : 'error'}>
                  {status === 'ENDED' ? 'Đã kết thúc' : 'Đã hủy'}
                </Tag>
              )
            }
          ]}
        />
      </div>
    </div>
  );
};

export default SessionHistoryPage;
