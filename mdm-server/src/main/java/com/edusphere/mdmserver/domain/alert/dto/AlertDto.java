package com.edusphere.mdmserver.domain.alert.dto;

import com.edusphere.mdmserver.domain.alert.enums.AlertSeverity;
import com.edusphere.mdmserver.domain.alert.enums.AlertStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class AlertDto {
    private UUID id;
    private String title;
    private String description;
    private AlertSeverity severity;
    private AlertStatus status;
    private Instant createdAt;
    
    // Minimal device info
    private DeviceBasicInfo device;

    @Data
    @Builder
    public static class DeviceBasicInfo {
        private UUID id;
        private String deviceName;
        private String deviceId;
    }
}
