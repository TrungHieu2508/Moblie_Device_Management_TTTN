package com.edusphere.mdmserver.domain.device.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HeartbeatResponse {
    private int nextHeartbeatSeconds;
    private int pendingCommands;
}
