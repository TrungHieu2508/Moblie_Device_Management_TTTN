package com.edusphere.mdmserver.domain.device.dto;

import lombok.Data;

import com.edusphere.mdmserver.domain.event.enums.EventType;

import java.time.Instant;
import java.util.Map;

@Data
public class DeviceEventRequest {
    private String deviceId;
    private EventType eventType;
    private Instant timestamp;
    private Map<String, Object> payload; // Dynamic payload depending on the event
}


