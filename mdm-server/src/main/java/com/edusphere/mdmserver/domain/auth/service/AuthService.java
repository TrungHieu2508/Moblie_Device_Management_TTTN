package com.edusphere.mdmserver.domain.auth.service;

import com.edusphere.mdmserver.domain.auth.dto.AuthResponse;
import com.edusphere.mdmserver.domain.auth.dto.LoginRequest;
import com.edusphere.mdmserver.domain.user.entity.RefreshToken;
import com.edusphere.mdmserver.domain.user.entity.User;
import com.edusphere.mdmserver.domain.user.repository.RefreshTokenRepository;
import com.edusphere.mdmserver.domain.user.repository.UserRepository;
import com.edusphere.mdmserver.security.CustomUserDetails;
import com.edusphere.mdmserver.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    @Value("${app.jwt.access-token-expiration}")
    private int accessTokenExpirationMs;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        // 1. Authenticate user
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();

        // 2. Generate tokens with extra claims to avoid DB lookup later
        java.util.Map<String, Object> extraClaims = java.util.HashMap.newHashMap(2);
        extraClaims.put("role", "ROLE_" + user.getRole().name());
        extraClaims.put("userId", user.getId().toString());
        String accessToken = jwtService.generateAccessToken(extraClaims, user.getUsername());
        String refreshTokenString = jwtService.generateRefreshToken(user.getUsername());

        // 3. Save refresh token to DB (revoke old ones optionally)
        refreshTokenRepository.deleteByUserId(user.getId());
        
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(refreshTokenString)
                .expiresAt(Instant.now().plusMillis(refreshTokenExpiration))
                .build();
        refreshTokenRepository.save(refreshToken);

        // 4. Update last login
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        // 5. Build response
        AuthResponse.UserDto userDto = AuthResponse.UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole())
                .schoolId(user.getSchool() != null ? user.getSchool().getId() : null)
                .build();

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenString)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpirationMs / 1000)
                .user(userDto)
                .build();
    }

    @Transactional
    public AuthResponse refreshToken(String token) {
        String username = jwtService.extractSubject(token);
        if (username == null) {
            throw new RuntimeException("Invalid refresh token format");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        RefreshToken savedToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Refresh token not found"));

        if (savedToken.getIsRevoked() || savedToken.getExpiresAt().isBefore(Instant.now()) || !jwtService.isTokenValid(token, username)) {
            throw new RuntimeException("Refresh token expired or revoked");
        }

        java.util.Map<String, Object> extraClaims = java.util.HashMap.newHashMap(2);
        extraClaims.put("role", "ROLE_" + user.getRole().name());
        extraClaims.put("userId", user.getId().toString());
        String newAccessToken = jwtService.generateAccessToken(extraClaims, user.getUsername());
        
        AuthResponse.UserDto userDto = AuthResponse.UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole())
                .schoolId(user.getSchool() != null ? user.getSchool().getId() : null)
                .build();

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(token)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpirationMs / 1000)
                .user(userDto)
                .build();
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenRepository.findByToken(refreshToken).ifPresent(token -> {
            token.setIsRevoked(true);
            refreshTokenRepository.save(token);
        });
    }
}
