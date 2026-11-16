import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input, Typography } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import axiosInstance, { API_BASE_URL } from '../../../config/axios';

const { Text } = Typography;

const LOCALHOST_PATTERN = /:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i;

interface EnrollmentQrBoxProps {
  code: string;
  size?: number;
}

/**
 * Hiển thị mã QR ghi danh và tự động lấy IP LAN thực tế của máy chủ từ /api/health
 * để khi mở Web bằng localhost vẫn quét QR ghi danh được trực tiếp qua Wi-Fi.
 */
const EnrollmentQrBox = ({ code, size = 220 }: EnrollmentQrBoxProps) => {
  const defaultFallback = API_BASE_URL.replace(/\/api\/?$/, '');
  const [serverUrl, setServerUrl] = useState<string>(defaultFallback);
  const [isCustomEdited, setIsCustomEdited] = useState(false);

  const { data: healthData } = useQuery({
    queryKey: ['server-health-lan'],
    queryFn: async () => {
      const res = await axiosInstance.get('/health');
      return res.data as { lanUrl?: string | null };
    },
    staleTime: 10_000,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (!isCustomEdited && healthData?.lanUrl && LOCALHOST_PATTERN.test(defaultFallback)) {
      setServerUrl(healthData.lanUrl);
    }
  }, [healthData?.lanUrl, defaultFallback, isCustomEdited]);

  const normalizedUrl = serverUrl.trim().replace(/\/+$/, '');
  const isLocalhostUrl = LOCALHOST_PATTERN.test(normalizedUrl);

  const handleChange = (val: string) => {
    setIsCustomEdited(true);
    setServerUrl(val);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full mb-3 text-left">
        <Text className="text-gray-400 text-xs block mb-1">
          Địa chỉ Server tự động trong mã QR (IP LAN cùng Wi-Fi):
        </Text>
        <Input
          value={serverUrl}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="http://192.168.1.x:8081"
          className="font-mono text-xs"
        />
        {isLocalhostUrl && (
          <Text className="text-amber-400 text-xs block mt-1">
            Chưa phát hiện được IP LAN (đang dùng localhost). Nếu quét qua cáp USB, chạy: adb reverse tcp:8081 tcp:8081
          </Text>
        )}
      </div>

      <div className="my-3 bg-white p-4 rounded-xl inline-block">
        <QRCodeSVG
          value={JSON.stringify({ serverUrl: normalizedUrl, code })}
          size={size}
          level="M"
          fgColor="#000000"
          bgColor="#FFFFFF"
        />
      </div>
    </div>
  );
};

export default EnrollmentQrBox;
