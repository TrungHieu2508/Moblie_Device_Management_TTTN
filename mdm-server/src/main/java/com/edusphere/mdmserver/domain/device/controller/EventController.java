package com.edusphere.mdmserver.domain.device.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.device.dto.DeviceEventRequest;
import com.edusphere.mdmserver.domain.device.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/devices")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @PostMapping("/event")
    public ResponseEntity<ApiResponse<Void>> receiveEvent(
            Principal principal,
            @RequestBody DeviceEventRequest request) {
        
        // The principal name is the deviceId (set by JwtAuthenticationFilter)
        String authDeviceId = principal.getName();

        eventService.processEvent(authDeviceId, request);
        return ResponseEntity.ok(ApiResponse.success(null, "Event received"));
    }
}
