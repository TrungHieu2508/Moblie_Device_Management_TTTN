import axiosInstance from '../config/axios';

export interface UserDto {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  school?: { id: string; name: string };
  campus?: { id: string; name: string };
  lastLoginAt: string;
  createdAt: string;
}

export const getUsers = async (params: { page?: number, size?: number, search?: string, role?: string, campusId?: string }) => {
  const { data } = await axiosInstance.get('/users', { params });
  return data.data; // ApiResponse.data (which is Page<UserDto>)
};

export const createUser = async (payload: any) => {
  const { data } = await axiosInstance.post('/users', payload);
  return data.data;
};

export const updateUser = async (id: string, payload: any) => {
  const { data } = await axiosInstance.patch(`/users/${id}`, payload);
  return data.data;
};

export const updateMyProfile = async (payload: { fullName?: string; email?: string; password?: string }) => {
  const { data } = await axiosInstance.patch('/users/me/profile', payload);
  return data.data; // UserDto
};

export const getMyProfile = async () => {
  const { data } = await axiosInstance.get('/users/me/profile');
  return data.data as UserDto;
};

export const deleteUser = async (id: string) => {
  const { data } = await axiosInstance.delete(`/users/${id}`);
  return data.data;
};
