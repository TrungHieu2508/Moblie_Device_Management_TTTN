package com.edusphere.mdmserver.domain.device.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class EnrollmentDto {
    private UUID id;
    private String code;
    private UUID campusId;
    private String campusName;
    private UUID schoolId;
    private String schoolName;
    private Instant expiresAt;
    private int maxUses;
    private int currentUses;
    private boolean isActive;
}
