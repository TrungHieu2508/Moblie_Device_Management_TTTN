package com.edusphere.mdmserver.domain.device.controller;

import com.edusphere.mdmserver.domain.device.dto.StreamFrame;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
@Slf4j
public class StreamController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/stream/frame")
    public void handleStreamFrame(StreamFrame payload) {
        if (payload != null && payload.getDeviceId() != null) {
            String topic = "/topic/devices/" + payload.getDeviceId() + "/screen";
            messagingTemplate.convertAndSend(topic, payload);
        }
    }
}
