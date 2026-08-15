import axiosInstance from '../config/axios';

export interface CampusDto {
  id: string;
  name: string;
  code: string;
  address: string;
}

export interface SchoolDto {
  id: string;
  campusId: string;
  campusName: string;
  name: string;
  code: string;
  address: string;
}

export const getSchools = async (params?: { page?: number, size?: number }) => {
  const { data } = await axiosInstance.get('/schools', { params });
  return data.data; // Page<SchoolDto>
};

export const getClassrooms = async (schoolId: string) => {
  const { data } = await axiosInstance.get(`/schools/${schoolId}/classrooms`);
  return data.data;
};

export const createClassroom = async (schoolId: string, classroomData: { name: string, code: string }) => {
  const { data } = await axiosInstance.post(`/schools/${schoolId}/classrooms`, classroomData);
  return data.data;
};

export const updateClassroom = async (id: string, classroomData: { name: string, code: string }) => {
  const { data } = await axiosInstance.put(`/classrooms/${id}`, classroomData);
  return data.data;
};

export const deleteClassroom = async (id: string) => {
  const { data } = await axiosInstance.delete(`/classrooms/${id}`);
  return data.data;
};

export const createSchool = async (schoolData: { campusId: string, name: string, code: string, address: string }) => {
  const { data } = await axiosInstance.post('/schools', schoolData);
  return data.data;
}

export const updateSchool = async (id: string, schoolData: { campusId: string, name: string, code: string, address: string }) => {
  const { data } = await axiosInstance.put(`/schools/${id}`, schoolData);
  return data.data;
}

export const deleteSchool = async (id: string) => {
  const { data } = await axiosInstance.delete(`/schools/${id}`);
  return data.data;
}

export const getAllCampuses = async () => {
  const { data } = await axiosInstance.get(`/campuses`);
  return data.data as CampusDto[];
};

export const createCampus = async (campusData: { name: string, code: string, address: string }) => {
  const { data } = await axiosInstance.post(`/campuses`, campusData);
  return data.data;
};

export const deleteCampus = async (id: string) => {
  const { data } = await axiosInstance.delete(`/campuses/${id}`);
  return data.data;
};
