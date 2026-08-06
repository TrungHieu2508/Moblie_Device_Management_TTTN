package com.edusphere.mdmserver.domain.alert.dto;

import com.edusphere.mdmserver.domain.alert.enums.AlertStatus;
import lombok.Data;

@Data
public class AlertStatusUpdateRequest {
    private AlertStatus status;
    private String resolutionNote;
}
