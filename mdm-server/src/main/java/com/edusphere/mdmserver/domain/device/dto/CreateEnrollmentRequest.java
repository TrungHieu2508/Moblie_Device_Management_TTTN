package com.edusphere.mdmserver.domain.device.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateEnrollmentRequest {
    @NotNull(message = "School ID is required")
    private UUID schoolId;

    @NotNull(message = "Campus ID is required")
    private UUID campusId;

    private Integer expiresInDays; // Default can be 7
    private Integer maxUses;       // Default can be 0 (unlimited)
}
