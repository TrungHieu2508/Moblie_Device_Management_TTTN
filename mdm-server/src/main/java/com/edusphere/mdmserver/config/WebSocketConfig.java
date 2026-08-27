package com.edusphere.mdmserver.config;

import com.edusphere.mdmserver.security.JwtChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtChannelInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Unified endpoint for Web Dashboard (SockJS fallback)
        registry.addEndpoint("/ws-web")
                .setAllowedOriginPatterns("*")
                .withSockJS();
                
        // Pure WebSocket endpoint for Android Agent (without SockJS wrapper)
        registry.addEndpoint("/ws-agent")
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Use /topic for broadcasting (Server -> Client)
        // Use /user for direct messaging (Server -> Specific User/Device)
        registry.enableSimpleBroker("/topic", "/user");
        
        // Prefix for messages sent FROM clients TO server (e.g., /app/webrtc/offer)
        registry.setApplicationDestinationPrefixes("/app");
        
        // Prefix for sending messages to a specific user/device using SimpMessagingTemplate
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Intercept incoming messages to perform JWT validation on CONNECT
        registration.interceptors(jwtChannelInterceptor);
    }
}
