package com.edusphere.mdmserver.domain.device.service;

import com.edusphere.mdmserver.domain.device.dto.DeviceEventRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    // private final RuleEngineService ruleEngineService; // To be implemented in Phase 4

    public void processEvent(String authDeviceId, DeviceEventRequest request) {
        if (!authDeviceId.equals(request.getDeviceId())) {
            throw new RuntimeException("Device ID mismatch between token and payload");
        }

        log.info("Received event {} from device {} at {}", 
                request.getEventType(), request.getDeviceId(), request.getTimestamp());

        // TODO: In Phase 4, we will pass this event to the Rule Engine to check for violations
        // Example: if eventType is APP_OPENED, check if payload "packageName" is in Blacklist
        // ruleEngineService.evaluateEvent(request);
    }
}
