package com.edusphere.mdmserver.domain.auth.dto;

import com.edusphere.mdmserver.domain.user.enums.UserRole;
import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private int expiresIn;
    private UserDto user;

    @Data
    @Builder
    public static class UserDto {
        private UUID id;
        private String username;
        private String fullName;
        private UserRole role;
        private UUID schoolId;
    }
}
