import axiosInstance from '../config/axios';

export interface ClassSessionDto {
  id: string;
  classroomId: string;
  classroomName: string;
  teacherId: string;
  teacherName: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
}

export const startSession = async (classroomId: string, teacherId: string): Promise<ClassSessionDto> => {
  const response = await axiosInstance.post(`/class-sessions/start?classroomId=${classroomId}&teacherId=${teacherId}`);
  return response.data.data;
};

export const endSession = async (sessionId: string): Promise<ClassSessionDto> => {
  const response = await axiosInstance.post(`/class-sessions/${sessionId}/end`);
  return response.data.data;
};

export const getActiveSessions = async (schoolId?: string): Promise<ClassSessionDto[]> => {
  const url = schoolId ? `/class-sessions/active?schoolId=${schoolId}` : '/class-sessions/active';
  const response = await axiosInstance.get(url);
  return response.data.data;
};

export const scheduleSession = async (
  classroomId: string,
  teacherId: string,
  scheduledStartTime: string,
  scheduledEndTime: string
): Promise<ClassSessionDto> => {
  const response = await axiosInstance.post('/class-sessions/schedule', {
    classroomId,
    teacherId,
    scheduledStartTime,
    scheduledEndTime
  });
  return response.data.data;
};

export const getScheduledSessions = async (schoolId?: string): Promise<ClassSessionDto[]> => {
  const url = schoolId ? `/class-sessions/scheduled?schoolId=${schoolId}` : '/class-sessions/scheduled';
  const response = await axiosInstance.get(url);
  return response.data.data;
};

export const getHistorySessions = async (schoolId?: string): Promise<ClassSessionDto[]> => {
  const url = schoolId ? `/class-sessions/history?schoolId=${schoolId}` : '/class-sessions/history';
  const response = await axiosInstance.get(url);
  return response.data.data;
};
