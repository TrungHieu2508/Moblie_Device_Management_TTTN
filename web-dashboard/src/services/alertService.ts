import axiosInstance from '../config/axios';

export interface AlertDto {
  id: string;
  alertCode: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  device?: { id: string; deviceName: string };
  rule?: { id: string; name: string };
  createdAt: string;
}

export const getAlerts = async (params: { page?: number, size?: number, status?: string, campusId?: string }) => {
  const { data } = await axiosInstance.get('/alerts', { params });
  return data.data; // ApiResponse.data (which is Page<Alert>)
};

export const updateAlertStatus = async (id: string, status: string, resolutionNote?: string) => {
  const { data } = await axiosInstance.patch(`/alerts/${id}/status`, { status, resolutionNote });
  return data.data;
};

export const resolveAllAlerts = async () => {
  const { data } = await axiosInstance.put('/alerts/resolve-all');
  return data.data;
};
