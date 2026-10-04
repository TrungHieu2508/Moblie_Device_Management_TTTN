import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config/axios';

export const useWebSocket = (deviceId?: string) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [deviceStatus, setDeviceStatus] = useState<string>('');
  const [alertInfo, setAlertInfo] = useState<any>(null);
  const [screenFrame, setScreenFrame] = useState<string | null>(null);
  const [currentApp, setCurrentApp] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    // Convert API_BASE_URL (http://host:8081/api) -> ws://host:8081/ws/dashboard
    const baseUrl = API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
    const wsUrl = `${baseUrl}/ws/dashboard?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Dashboard WebSocket Connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, data } = message;

        switch (type) {
          case 'DEVICE_STATUS':
            if (deviceId && data.deviceId === deviceId) {
              setDeviceStatus(data.status);
            }
            break;
          case 'DEVICE_METRICS':
            if (deviceId && data.deviceId === deviceId) {
              setMetrics(data.metrics);
            }
            break;
          case 'DEVICE_CURRENT_APP':
            if (deviceId && data.deviceId === deviceId) {
              setCurrentApp(data.currentApp);
            }
            break;
          case 'NEW_ALERT':
            setAlertInfo(data);
            break;
          case 'ALERT_STATUS_CHANGED':
            // Có thể xử lý sau
            break;
          case 'INITIAL_STATE':
            console.log('Initial WS State:', data);
            break;
        }
      } catch (err) {
        console.error('Error parsing WS message', err);
      }
    };

    ws.onclose = () => {
      console.log('Dashboard WebSocket Disconnected');
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
    };

    // Ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 15000);

    return () => {
      clearInterval(pingInterval);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [deviceId]);

  return { isConnected, metrics, deviceStatus, alertInfo, screenFrame, currentApp };
};
