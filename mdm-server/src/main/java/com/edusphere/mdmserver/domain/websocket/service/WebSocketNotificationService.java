package com.edusphere.mdmserver.domain.websocket.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public void notifyDeviceStatusChange(String deviceId, Object statusPayload) {
        String destination = "/topic/devices/" + deviceId + "/status";
        messagingTemplate.convertAndSend(destination, statusPayload);
        log.debug("Broadcasted device status to {}", destination);
    }

    public void broadcastDeviceMetrics(String deviceId, Object metricsPayload) {
        String destination = "/topic/devices/" + deviceId + "/metrics";
        messagingTemplate.convertAndSend(destination, metricsPayload);
        // Trace log instead of debug to avoid log spam for every heartbeat
        log.trace("Broadcasted device metrics to {}", destination);
    }

    public void sendCommandToDevice(String deviceId, Object commandPayload) {
        String destination = "/topic/devices/" + deviceId + "/command";
        messagingTemplate.convertAndSend(destination, commandPayload);
        log.info("Sent remote command to device {} via {}", deviceId, destination);
    }

    public void broadcastNewAlert(Object alertPayload) {
        String destination = "/topic/alerts/new";
        messagingTemplate.convertAndSend(destination, alertPayload);
        log.info("Broadcasted new alert to {}", destination);
    }
    
    public void broadcastAlertStatusChange(String alertId, Object statusPayload) {
        String destination = "/topic/alerts/" + alertId + "/status";
        messagingTemplate.convertAndSend(destination, statusPayload);
        log.info("Broadcasted alert status change to {}", destination);
    }
}
