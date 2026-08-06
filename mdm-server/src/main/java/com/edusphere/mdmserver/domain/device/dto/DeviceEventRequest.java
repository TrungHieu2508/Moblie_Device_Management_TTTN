package com.edusphere.mdmserver.domain.device.dto;

import lombok.Data;

import java.time.Instant;
import java.util.Map;

@Data
public class DeviceEventRequest {
    private String deviceId;
    private EventType eventType;
    private Instant timestamp;
    private Map<String, Object> payload; // Dynamic payload depending on the event

    public enum EventType {
        APP_OPENED,
        APP_CLOSED,
        USB_CONNECTED,
        USB_DISCONNECTED,
        POWER_CONNECTED,
        POWER_DISCONNECTED,
        SCREEN_UNLOCKED,
        SETTINGS_CHANGED,
        AGENT_TAMPER_ATTEMPT // User trying to force stop or uninstall agent
    }
}
