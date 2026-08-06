package com.edusphere.mdmserver.domain.device.service;

import com.edusphere.mdmserver.domain.device.dto.DeviceEventRequest;
import com.edusphere.mdmserver.domain.device.repository.DeviceRepository;
import com.edusphere.mdmserver.domain.device.entity.Device;
import com.edusphere.mdmserver.domain.rule.service.RuleEngineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    private final RuleEngineService ruleEngineService;
    private final DeviceRepository deviceRepository;

    public void processEvent(String authDeviceId, DeviceEventRequest request) {
        if (!authDeviceId.equals(request.getDeviceId())) {
            throw new IllegalArgumentException("Device ID mismatch between token and payload");
        }

        log.info("Received event {} from device {} at {}", 
                request.getEventType(), request.getDeviceId(), request.getTimestamp());

        Device device = deviceRepository.findByDeviceId(authDeviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + authDeviceId));

        // Pass event to Rule Engine
        ruleEngineService.evaluateEvent(device, request.getEventType(), request.getPayload());
    }
}
