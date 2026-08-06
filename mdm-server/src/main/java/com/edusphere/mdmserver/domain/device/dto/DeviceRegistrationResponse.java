package com.edusphere.mdmserver.domain.device.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class DeviceRegistrationResponse {
    private UUID deviceUuid;
    private String registrationToken;
    private Instant tokenExpiresAt;
    private ServerConfig serverConfig;

    @Data
    @Builder
    public static class ServerConfig {
        private int heartbeatIntervalSeconds;
        private String websocketUrl;
    }
}
