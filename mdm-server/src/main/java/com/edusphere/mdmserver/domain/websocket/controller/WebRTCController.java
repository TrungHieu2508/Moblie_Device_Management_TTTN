package com.edusphere.mdmserver.domain.websocket.controller;

import com.edusphere.mdmserver.domain.websocket.dto.WebRTCSignal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
@Slf4j
public class WebRTCController {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Clients (Admin/Dashboard or Android Agent) send WebRTC signals here.
     * The server acts merely as a signaling router, passing the message to the target.
     */
    @MessageMapping("/webrtc/signal")
    public void routeWebRTCSignal(@Payload WebRTCSignal signal, SimpMessageHeaderAccessor headerAccessor) {
        Principal user = headerAccessor.getUser();
        if (user == null) {
            log.warn("Unauthorized WebRTC signal attempt");
            return;
        }

        // The sender is automatically identified by their authentication Principal
        signal.setSenderId(user.getName());
        
        log.debug("Routing WebRTC {} from {} to {}", signal.getType(), signal.getSenderId(), signal.getTargetId());

        // We use the /user prefix for direct messaging.
        // Spring's UserDestinationMessageHandler will resolve this to the specific user's session.
        messagingTemplate.convertAndSendToUser(
                signal.getTargetId(), 
                "/topic/webrtc", 
                signal
        );
    }
}
