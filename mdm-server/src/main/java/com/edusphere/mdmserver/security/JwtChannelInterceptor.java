package com.edusphere.mdmserver.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            List<String> authorization = accessor.getNativeHeader("Authorization");
            log.debug("STOMP Connect Authorization header: {}", authorization);

            if (authorization != null && !authorization.isEmpty()) {
                String authHeader = authorization.get(0);
                
                try {
                    // Admin/Dashboard Web connection
                    if (authHeader.startsWith("Bearer ")) {
                        String jwt = authHeader.substring(7);
                        String username = jwtService.extractSubject(jwt);
                        if (username != null && jwtService.isTokenValid(jwt, username)) {
                            String role = jwtService.extractClaim(jwt, claims -> claims.get("role", String.class));
                            java.util.List<org.springframework.security.core.authority.SimpleGrantedAuthority> authorities = 
                                    role != null ? java.util.Collections.singletonList(new org.springframework.security.core.authority.SimpleGrantedAuthority(role)) 
                                                 : java.util.Collections.emptyList();
                            UsernamePasswordAuthenticationToken authToken = 
                                    new UsernamePasswordAuthenticationToken(username, null, authorities);
                            accessor.setUser(authToken);
                            log.debug("Admin WebSocket connected: {}", username);
                        }
                    } 
                    // Android Agent connection
                    else if (authHeader.startsWith("Device ")) {
                        String jwt = authHeader.substring(7);
                        String deviceId = jwtService.extractSubject(jwt);
                        if (deviceId != null && jwtService.isTokenValid(jwt, deviceId)) {
                            // For devices, we can just set a basic principal with the device ID
                            // In a more complex setup, we could load DeviceDetails and set authorities
                            UsernamePasswordAuthenticationToken deviceAuth = 
                                    new UsernamePasswordAuthenticationToken(deviceId, null, List.of(() -> "ROLE_DEVICE"));
                            accessor.setUser(deviceAuth);
                            log.debug("Device WebSocket connected: {}", deviceId);
                        }
                    }
                } catch (Exception e) {
                    log.error("Failed to authenticate STOMP connection", e);
                    // Throwing exception here will reject the CONNECT frame
                    throw new IllegalArgumentException("Invalid Token");
                }
            } else {
                throw new IllegalArgumentException("Missing Authorization header");
            }
        } else if (accessor != null && StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            // SECURITY CHECK: Prevent devices from subscribing to other devices' topics
            String destination = accessor.getDestination();
            if (destination != null && destination.startsWith("/topic/devices/")) {
                String principalName = accessor.getUser() != null ? accessor.getUser().getName() : null;
                boolean isDevice = accessor.getUser() != null && 
                                   accessor.getUser().getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_DEVICE"));
                
                if (isDevice) {
                    // destination format: /topic/devices/{deviceId}/...
                    String[] parts = destination.split("/");
                    if (parts.length >= 4) {
                        String targetDeviceId = parts[3];
                        if (!targetDeviceId.equals(principalName)) {
                            log.warn("Device {} attempted to subscribe to unauthorized topic: {}", principalName, destination);
                            throw new IllegalArgumentException("Device not authorized to subscribe to this topic");
                        }
                    }
                }
            }
        }
        return message;
    }
}
