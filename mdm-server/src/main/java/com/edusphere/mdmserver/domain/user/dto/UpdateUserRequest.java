package com.edusphere.mdmserver.domain.user.dto;

import com.edusphere.mdmserver.domain.user.enums.UserRole;
import lombok.Data;

import java.util.UUID;

@Data
public class UpdateUserRequest {
    private String fullName;
    private String email;
    private String password;
    private UserRole role;
    private Boolean isActive;
    private UUID schoolId;
    private UUID campusId;
}
