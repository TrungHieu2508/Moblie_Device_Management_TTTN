import axiosInstance from '../config/axios';

export interface EnrollmentDto {
  id: string;
  code: string;
  campusId: string;
  campusName: string;
  schoolId: string;
  schoolName: string;
  expiresAt: string;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
}

export const createEnrollmentProfile = async (data: { schoolId: string, campusId: string, expiresInDays?: number, maxUses?: number }) => {
  const response = await axiosInstance.post('/enrollments', data);
  return response.data.data;
};

export const getActiveEnrollments = async () => {
  const response = await axiosInstance.get('/enrollments');
  return response.data.data as EnrollmentDto[];
};
