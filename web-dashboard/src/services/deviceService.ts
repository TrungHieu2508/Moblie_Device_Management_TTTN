import axiosInstance from '../config/axios';

export interface DeviceDto {
  id: string;
  deviceId: string;
  deviceName: string;
  serialNumber?: string;
  model: string;
  androidVersion: string;
  agentVersion: string;
  status: string;
  school?: { id: string; name: string };
  campus?: { id: string; name: string };
  classroom?: { id: string; name: string };
  lastHeartbeatAt: string;
  metrics?: {
    batteryLevel?: number;
    ramUsage?: number;
    storageUsage?: number;
    wifiSsid?: string;
    currentApp?: {
      packageName?: string;
      appName?: string;
      appIconBase64?: string;
    };
  };
  currentApp?: {
    packageName?: string;
    appName?: string;
    appIconBase64?: string;
  };
}

export const getDevices = async (params?: { page?: number, size?: number, schoolId?: string, campusId?: string, classroomId?: string, status?: string, search?: string, androidVersion?: string }) => {
  const { data } = await axiosInstance.get('/devices', { params });
  return data.data; // Page<DeviceDto>
};

export const getDeviceById = async (id: string) => {
  const { data } = await axiosInstance.get(`/devices/${id}`);
  return data.data as DeviceDto;
};

export const registerDevice = async (deviceData: any) => {
  const { data } = await axiosInstance.post('/devices/register', deviceData);
  return data.data;
};

export const updateDevice = async (id: string, updateData: { deviceName?: string, notes?: string, campusId?: string, schoolId?: string, classroomId?: string }) => {
  const { data } = await axiosInstance.put(`/devices/${id}`, updateData);
  return data.data;
};

export const assignDeviceLocation = async (id: string, assignData: { campusId?: string, schoolId?: string, classroomId?: string }) => {
  const { data } = await axiosInstance.patch(`/devices/${id}/assign`, assignData);
  return data.data;
};

export const deleteDevice = async (id: string) => {
  const { data } = await axiosInstance.delete(`/devices/${id}`);
  return data.data;
};
