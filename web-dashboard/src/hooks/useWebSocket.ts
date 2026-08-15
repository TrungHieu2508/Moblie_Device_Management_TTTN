import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '../store/authStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8080/api/ws';

export const useWebSocket = (deviceId?: string) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [deviceStatus, setDeviceStatus] = useState<string>('');
  const [alertInfo, setAlertInfo] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL), // Use SockJS fallback if needed
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (str) => {
        // console.log(str); // Uncomment for debugging
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    client.onConnect = () => {
      setIsConnected(true);
      
      // If a specific device ID is provided, subscribe to its topics
      if (deviceId) {
        // Subscribe to real-time metrics (RAM, CPU, Battery)
        client.subscribe(`/topic/devices/${deviceId}/metrics`, (message) => {
          if (message.body) {
            setMetrics(JSON.parse(message.body));
          }
        });

        // Subscribe to status changes (ONLINE, OFFLINE, WARNING)
        client.subscribe(`/topic/devices/${deviceId}/status`, (message) => {
          if (message.body) {
            const data = JSON.parse(message.body);
            setDeviceStatus(data.status);
          }
        });
      }

      // Global alerts topic
      client.subscribe('/topic/alerts/new', (message) => {
        if (message.body) {
          setAlertInfo(JSON.parse(message.body));
        }
      });
    };

    client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    client.onWebSocketClose = () => {
      setIsConnected(false);
    };

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [deviceId]);

  // Function to manually send a command via REST API instead of WS
  // For MDM, commands from Admin -> Server are usually REST POST /commands
  // Server -> Agent is WS. 

  return { isConnected, metrics, deviceStatus, alertInfo };
};
