import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config/axios';

export const useWebSocket = (deviceId?: string) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [deviceStatus, setDeviceStatus] = useState<string>('');
  const [alertInfo, setAlertInfo] = useState<any>(null);
  const [screenFrame, setScreenFrame] = useState<string | null>(null);
  const [currentApp, setCurrentApp] = useState<any>(null);
  const [commandAck, setCommandAck] = useState<any>(null);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [liveDevicesMap, setLiveDevicesMap] = useState<Record<string, { status?: string; metrics?: any; currentApp?: any }>>({});
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const deviceIdRef = useRef<string | undefined>(deviceId);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    deviceIdRef.current = deviceId;
    setScreenFrame(null);
  }, [deviceId]);

  useEffect(() => {
    if (!accessToken) {
      setIsConnected(false);
      return;
    }

    // Convert API_BASE_URL (http://host:8081/api) -> ws://host:8081/ws/dashboard
    const baseUrl = API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
    let isDisposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingInterval: ReturnType<typeof setInterval> | null = null;
    let reconnectAttempt = 0;

    const connect = () => {
      if (isDisposed) return;

      const wsUrl = `${baseUrl}/ws/dashboard?token=${accessToken}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isDisposed || wsRef.current !== ws) {
          ws.close();
          return;
        }
        reconnectAttempt = 0;
        console.log('Dashboard WebSocket Connected');
        setIsConnected(true);
      };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, data } = message;
        const targetId = deviceIdRef.current;

        switch (type) {
          case 'DEVICE_STATUS':
            setLastEvent({ type, data, ts: Date.now() });
            if (data?.deviceId) {
              setLiveDevicesMap((prev) => ({
                ...prev,
                [data.deviceId]: { ...prev[data.deviceId], status: data.status },
              }));
            }
            if (targetId && data.deviceId === targetId) {
              setDeviceStatus(data.status);
            }
            break;
          case 'DEVICE_METRICS':
            if (data?.deviceId) {
              setLiveDevicesMap((prev) => ({
                ...prev,
                [data.deviceId]: { ...prev[data.deviceId], metrics: data.metrics },
              }));
            }
            if (targetId && data.deviceId === targetId) {
              setMetrics(data.metrics);
            }
            break;
          case 'DEVICE_CURRENT_APP':
            if (data?.deviceId) {
              setLiveDevicesMap((prev) => ({
                ...prev,
                [data.deviceId]: { ...prev[data.deviceId], currentApp: data.currentApp },
              }));
            }
            if (targetId && data.deviceId === targetId) {
              setCurrentApp(data.currentApp);
            }
            break;
          case 'SCREEN_FRAME':
            if (targetId && data.deviceId === targetId) {
              setScreenFrame(data.frame);
            }
            break;
          case 'COMMAND_ACK':
            setLastEvent({ type, data, ts: Date.now() });
            if (!targetId || data.deviceId === targetId) {
              setCommandAck({ ...data, ts: Date.now() });
            }
            break;
          case 'NEW_ALERT':
            setAlertInfo(data);
            setLastEvent({ type, data, ts: Date.now() });
            break;
          case 'ALERT_STATUS_CHANGED':
            setLastEvent({ type, data, ts: Date.now() });
            break;
          case 'INITIAL_STATE':
            console.log('Initial WS State:', data);
            break;
        }
      } catch (err) {
        console.error('Error parsing WS message', err);
      }
    };

      ws.onclose = (event) => {
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
        setIsConnected(false);
        if (isDisposed || wsRef.current !== ws) return;
        // Skip reconnect on explicit auth/policy rejection (1008 / 4001)
        if (event.code === 1008 || event.code === 4001) return;

        const delayMs = Math.min(1000 * Math.pow(2, reconnectAttempt), 15000);
        reconnectAttempt += 1;
        console.log(`Dashboard WebSocket Disconnected, retrying in ${delayMs}ms`);
        reconnectTimer = setTimeout(connect, delayMs);
      };

      ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
      };

      // Ping interval to keep connection alive
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING' }));
        }
      }, 15000);
    };

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingInterval) clearInterval(pingInterval);
      const activeWs = wsRef.current;
      wsRef.current = null;
      if (activeWs && (activeWs.readyState === WebSocket.OPEN || activeWs.readyState === WebSocket.CONNECTING)) {
        activeWs.close();
      }
    };
  }, [accessToken]);

  const clearScreenFrame = () => setScreenFrame(null);

  return { isConnected, metrics, deviceStatus, alertInfo, screenFrame, clearScreenFrame, currentApp, commandAck, lastEvent, liveDevicesMap };
};
