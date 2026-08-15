import axiosInstance from '../config/axios';

export interface DashboardSummaryDto {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  warningDevices: number;
  criticalDevices: number;
  unresolvedAlerts: number;
  safetyIndex: number;
}

export const getDashboardSummary = async () => {
  const { data } = await axiosInstance.get('/dashboard/summary');
  return data.data as DashboardSummaryDto;
};
