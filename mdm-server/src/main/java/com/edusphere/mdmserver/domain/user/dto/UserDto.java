package com.edusphere.mdmserver.domain.user.dto;

import com.edusphere.mdmserver.domain.school.dto.CampusDto;
import com.edusphere.mdmserver.domain.school.dto.SchoolDto;
import com.edusphere.mdmserver.domain.user.enums.UserRole;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class UserDto {
    private UUID id;
    private String username;
    private String email;
    private String fullName;
    private UserRole role;
    private Boolean isActive;
    private SchoolDto school;
    private CampusDto campus;
    private Instant lastLoginAt;
    private Instant createdAt;
}
