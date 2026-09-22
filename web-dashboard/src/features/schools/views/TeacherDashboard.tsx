import { useState } from 'react';
import { Card, Button, Typography, Space, Tag, Modal, Select, message, Spin, Empty, Calendar, Badge, DatePicker, Drawer, Table, Form, Input, Popconfirm, Popover } from 'antd';
import type { Dayjs } from 'dayjs';
import { PlayCircleOutlined, StopOutlined, VideoCameraOutlined, CalendarOutlined, EditOutlined, DeleteOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { getActiveSessions, startSession, endSession, scheduleSession, getScheduledSessions } from '../../../services/classSessionService';
import { getClassrooms, createClassroom, updateClassroom, deleteClassroom } from '../../../services/schoolService';
import { useNavigate, useParams } from 'react-router-dom';

const { Title, Text } = Typography;

const TeacherDashboard = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isScheduleModalVisible, setIsScheduleModalVisible] = useState(false);
  const [isClassroomDrawerVisible, setIsClassroomDrawerVisible] = useState(false);
  const [isClassroomModalVisible, setIsClassroomModalVisible] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<any>(null);
  const [classroomForm] = Form.useForm();
  
  const { schoolId: urlSchoolId } = useParams();
  const effectiveSchoolId = urlSchoolId || user?.schoolId;

  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [scheduleDates, setScheduleDates] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const { data: activeSessions = [], isLoading: isSessionsLoading, isError: isSessionsError, error: sessionsError } = useQuery({
    queryKey: ['activeSessions', effectiveSchoolId],
    queryFn: () => getActiveSessions(effectiveSchoolId),
    refetchInterval: 60000 // Poll every 60s
  });

  const { data: scheduledSessions = [], isLoading: isScheduledLoading, isError: isScheduledError, error: scheduledError } = useQuery({
    queryKey: ['scheduledSessions', effectiveSchoolId],
    queryFn: () => getScheduledSessions(effectiveSchoolId),
    refetchInterval: 60000 // Poll every 60s
  });


  // Fetch classrooms for this school
  const { data: classrooms = [], isLoading: isClassroomsLoading } = useQuery({
    queryKey: ['classrooms', effectiveSchoolId],
    queryFn: () => getClassrooms(effectiveSchoolId as string),
    enabled: !!effectiveSchoolId
  });

  const createClassroomMutation = useMutation({
    mutationFn: (data: any) => createClassroom(effectiveSchoolId as string, data),
    onSuccess: () => {
      message.success('Đã thêm lớp học mới');
      setIsClassroomModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể thêm lớp học mới');
    }
  });

  const updateClassroomMutation = useMutation({
    mutationFn: (data: any) => updateClassroom(editingClassroom.id, data),
    onSuccess: () => {
      message.success('Cập nhật lớp học thành công');
      setIsClassroomModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể cập nhật lớp học');
    }
  });

  const deleteClassroomMutation = useMutation({
    mutationFn: deleteClassroom,
    onSuccess: () => {
      message.success('Đã xóa lớp học');
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể xóa lớp học');
    }
  });

  const handleSaveClassroom = (values: any) => {
    if (editingClassroom) {
      updateClassroomMutation.mutate(values);
    } else {
      createClassroomMutation.mutate(values);
    }
  };

  const scheduleSessionMutation = useMutation({
    mutationFn: (data: { classroomId: string; startTime: string; endTime: string }) => 
      scheduleSession(data.classroomId, user!.id, data.startTime, data.endTime),
    onSuccess: () => {
      message.success('Đã lên lịch lớp học thành công!');
      setIsScheduleModalVisible(false);
      setScheduleDates([null, null]);
      queryClient.invalidateQueries({ queryKey: ['scheduledSessions'] });
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể lên lịch lớp học.');
    }
  });

  const endSessionMutation = useMutation({
    mutationFn: endSession,
    onSuccess: () => {
      message.success('Đã kết thúc/hủy lớp học!');
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      queryClient.invalidateQueries({ queryKey: ['scheduledSessions'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Không thể kết thúc lớp học.');
    }
  });

  const handleScheduleSession = () => {
    if (!selectedClassroomId || !scheduleDates[0] || !scheduleDates[1]) {
      message.warning('Vui lòng chọn lớp học và thời gian đầy đủ');
      return;
    }
    scheduleSessionMutation.mutate({
      classroomId: selectedClassroomId,
      startTime: scheduleDates[0].toISOString(),
      endTime: scheduleDates[1].toISOString()
    });
  };

  const handleEndSession = (sessionId: string) => {
    Modal.confirm({
      title: 'Kết thúc lớp học?',
      content: 'Bạn có chắc chắn muốn kết thúc lớp học này không? Các thiết bị sẽ không còn bị ràng buộc trong phiên này.',
      okText: 'Kết thúc',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => endSessionMutation.mutate(sessionId)
    });
  };

  if (isSessionsLoading || isScheduledLoading) return <Spin size="large" className="block mx-auto mt-20" />;

  // Filter sessions that belong to this teacher (or show all if they are IT_ADMIN/SUPER_ADMIN looking at this view)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'IT_ADMIN';
  const displayedSessions = activeSessions;
  const displayedScheduled = scheduledSessions;

  const allSessionsToDisplay = [...displayedSessions, ...displayedScheduled];

  const getListData = (value: Dayjs) => {
    const listData: any[] = [];
    allSessionsToDisplay.forEach((s: any) => {
      const startTimeStr = s.status === 'ACTIVE' ? s.startedAt : s.scheduledStartTime;
      if (!startTimeStr) return;
      const start = new Date(startTimeStr);
      if (start.getDate() === value.date() && start.getMonth() === value.month() && start.getFullYear() === value.year()) {
        const type = s.status === 'ACTIVE' ? 'success' : 'warning';
        listData.push({ type, content: `${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${s.classroomName}` });
      }
    });
    return listData;
  };

  const dateCellRender = (value: Dayjs) => {
    const listData = getListData(value);

    const popoverContent = listData.length > 0 ? (
      <ul className="m-0 p-0 list-none">
        {listData.map((item, index) => (
          <li key={index} className="text-sm py-1 border-b border-[#2e303a] last:border-0">
            <Badge status={item.type as any} text={<span className="text-gray-300">{item.content}</span>} />
          </li>
        ))}
      </ul>
    ) : (
      <span className="text-gray-500 text-sm">Không có lịch học</span>
    );

    return (
      <Popover 
        content={<div className="max-w-[200px]">{popoverContent}</div>} 
        title={<span className="text-gray-200 font-bold border-b border-[#2e303a] pb-1 block">{value.format('DD/MM/YYYY')}</span>} 
        trigger="hover"
        placement="top"
        overlayInnerStyle={{ backgroundColor: '#1f2028', borderColor: '#2e303a' }}
      >
        <div className="w-full h-full min-h-[80px] p-1 cursor-pointer">
          <ul className="m-0 p-0 list-none">
            {listData.map((item, index) => (
              <li key={index} className="text-xs truncate">
                <Badge status={item.type as any} text={<span className="text-gray-300">{item.content}</span>} />
              </li>
            ))}
          </ul>
        </div>
      </Popover>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Title level={3} className="!m-0 !text-white flex items-center gap-4 mb-2">
            <span>{isSuperAdmin && urlSchoolId ? 'Bảng Điều Khiển Trường Học' : (isSuperAdmin ? 'Quản lý toàn bộ Lớp học' : 'Lớp học của tôi')}</span>
          </Title>
          {isSessionsError && <div className="mb-2"><Tag color="error">Lỗi API Active: {String(sessionsError)}</Tag></div>}
          {isScheduledError && <div className="mb-2"><Tag color="error">Lỗi API Scheduled: {String(scheduledError)}</Tag></div>}
          <Text className="text-gray-400 block mt-2">Quản lý và giám sát thiết bị trong giờ học</Text>
        </div>
        <div className="flex gap-4">
          <Button 
            icon={<SettingOutlined />} 
            className="h-10 px-6 font-medium text-white border-gray-600 bg-[#1f2028] hover:border-purple-500 hover:text-purple-400"
            onClick={() => setIsClassroomDrawerVisible(true)}
          >
            Quản lý Lớp học
          </Button>
          <Button 
            type="primary"
            icon={<CalendarOutlined />} 
            className="h-10 px-6 font-medium border-0 bg-blue-600 hover:bg-blue-500"
            onClick={() => setIsScheduleModalVisible(true)}
          >
            Lên lịch học
          </Button>
        </div>
      </div>

      <Title level={4} className="!text-gray-200 mb-4 border-b border-[#2e303a] pb-2">Lớp đang diễn ra</Title>
      
      {allSessionsToDisplay.length === 0 ? (
        <Empty 
          description={<span className="text-gray-500">Hiện không có lớp học nào đang hoặc sắp diễn ra</span>} 
          className="bg-[#16171d] py-12 rounded-xl border border-[#2e303a]"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allSessionsToDisplay.map((session: any) => (
            <Card key={session.id} className={`bg-[#1f2028] shadow-lg rounded-xl transition-colors border ${session.status === 'ACTIVE' ? 'border-green-500/30 hover:border-green-500' : 'border-blue-500/30 hover:border-blue-500'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Title level={4} className={`!m-0 ${session.status === 'ACTIVE' ? '!text-green-400' : '!text-blue-400'}`}>{session.classroomName}</Title>
                  <Text className="text-gray-400 text-xs">
                    {isSuperAdmin ? `Giáo viên: ${session.teacherName} | ` : ''}
                    {session.status === 'ACTIVE' ? 'Bắt đầu' : 'Dự kiến'}: {session.status === 'ACTIVE' ? new Date(session.startedAt).toLocaleTimeString() : new Date(session.scheduledStartTime).toLocaleTimeString()}
                  </Text>
                </div>
                {session.status === 'ACTIVE' ? (
                  <Tag color="success" className="animate-pulse border-0">Đang Live</Tag>
                ) : (
                  <Tag color="processing" className="border-0">Sắp diễn ra</Tag>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <Button 
                  type="primary" 
                  ghost 
                  icon={<VideoCameraOutlined />} 
                  className="flex-1"
                  onClick={() => navigate(`/live-classes/${session.id}${effectiveSchoolId ? `?schoolId=${effectiveSchoolId}` : ''}`)}
                  disabled={session.status !== 'ACTIVE'}
                >
                  {session.status === 'ACTIVE' ? 'Vào lớp' : 'Chưa bắt đầu'}
                </Button>
                <Popconfirm
                  title="Kết thúc/Hủy lớp học?"
                  description={session.status === 'ACTIVE' ? "Bạn có chắc chắn muốn kết thúc lớp học này không?" : "Bạn có chắc chắn muốn hủy lịch lớp học này không?"}
                  onConfirm={() => handleEndSession(session.id)}
                  okText="Đồng ý"
                  cancelText="Không"
                  okButtonProps={{ danger: true }}
                >
                  <Button 
                    danger 
                    icon={<StopOutlined />}
                    loading={endSessionMutation.isPending}
                  />
                </Popconfirm>
              </div>
            </Card>
          ))}
        </div>
      )}
      {/* Schedule Session Modal */}
      <Modal
        title="Lên lịch lớp học"
        open={isScheduleModalVisible}
        onCancel={() => setIsScheduleModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsScheduleModalVisible(false)}>Hủy</Button>,
          <Button 
            key="submit" 
            type="primary" 
            className="bg-blue-600 hover:bg-blue-500"
            loading={scheduleSessionMutation.isPending} 
            onClick={handleScheduleSession}
          >
            Xác nhận lịch
          </Button>
        ]}
        className="dark-modal"
      >
        <div className="py-4 flex flex-col gap-4">
          <div>
            <p className="text-gray-300 mb-2">Chọn lớp học:</p>
            <Select 
              className="w-full" 
              placeholder="-- Chọn lớp học --"
              value={selectedClassroomId}
              onChange={setSelectedClassroomId}
              loading={isClassroomsLoading}
            >
              {classrooms?.map((cr: any) => (
                <Select.Option key={cr.id} value={cr.id}>{cr.name} ({cr.code})</Select.Option>
              ))}
            </Select>
          </div>
          
          <div>
            <p className="text-gray-300 mb-2">Thời gian bắt đầu & kết thúc:</p>
            <DatePicker.RangePicker 
              showTime 
              className="w-full" 
              value={scheduleDates}
              onChange={(dates) => setScheduleDates(dates as any)}
            />
          </div>
        </div>
      </Modal>

      {/* Timetable / Calendar */}
      <div className="mt-12 bg-[#1f2028] p-6 rounded-xl border border-[#2e303a]">
        <Title level={4} className="!text-gray-200 mb-6 pb-2 border-b border-[#2e303a]">Thời khóa biểu</Title>
        <div className="bg-[#16171d] rounded-lg p-2 overflow-x-auto">
          <Calendar cellRender={dateCellRender} className="min-w-[800px] text-gray-300" />
        </div>
      </div>


      {/* Classroom Management Drawer */}
      <Drawer
        title="Quản lý Danh sách Lớp học"
        placement="right"
        width={600}
        onClose={() => setIsClassroomDrawerVisible(false)}
        open={isClassroomDrawerVisible}
        className="dark-drawer"
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => {
              setEditingClassroom(null);
              classroomForm.resetFields();
              setIsClassroomModalVisible(true);
            }}
          >
            Thêm Lớp Mới
          </Button>
        }
      >
        <Table 
          dataSource={classrooms}
          rowKey="id"
          loading={isClassroomsLoading}
          pagination={{ pageSize: 10 }}
          className="dark-table"
          columns={[
            { title: 'Mã lớp', dataIndex: 'code', key: 'code', width: 100 },
            { title: 'Tên lớp', dataIndex: 'name', key: 'name' },
            { 
              title: 'Thao tác', 
              key: 'actions',
              width: 150,
              render: (_, record: any) => (
                <Space>
                  <Button 
                    type="text" 
                    icon={<EditOutlined className="text-blue-400" />} 
                    onClick={() => {
                      setEditingClassroom(record);
                      classroomForm.setFieldsValue(record);
                      setIsClassroomModalVisible(true);
                    }}
                  />
                  <Popconfirm 
                    title="Xóa lớp học này?"
                    onConfirm={() => deleteClassroomMutation.mutate(record.id)}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              )
            }
          ]}
        />
      </Drawer>

      <Modal
        title={editingClassroom ? "Sửa Lớp Học" : "Thêm Lớp Học Mới"}
        open={isClassroomModalVisible}
        onCancel={() => setIsClassroomModalVisible(false)}
        onOk={() => classroomForm.submit()}
        confirmLoading={createClassroomMutation.isPending || updateClassroomMutation.isPending}
        className="dark-modal"
      >
        <Form form={classroomForm} layout="vertical" onFinish={handleSaveClassroom} className="mt-4">
          <Form.Item name="code" label="Mã Lớp (VD: L01)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Tên Lớp (VD: Lớp 10A1)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeacherDashboard;
