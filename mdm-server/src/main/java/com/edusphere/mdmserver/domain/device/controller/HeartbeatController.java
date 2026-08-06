package com.edusphere.mdmserver.domain.device.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.device.dto.HeartbeatRequest;
import com.edusphere.mdmserver.domain.device.dto.HeartbeatResponse;
import com.edusphere.mdmserver.domain.device.service.HeartbeatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/devices")
@RequiredArgsConstructor
public class HeartbeatController {

    private final HeartbeatService heartbeatService;

    @PostMapping("/heartbeat")
    public ResponseEntity<ApiResponse<HeartbeatResponse>> receiveHeartbeat(
            Principal principal,
            @RequestBody HeartbeatRequest request) {
        
        // The principal name is the deviceId (set by JwtAuthenticationFilter)
        String authDeviceId = principal.getName();

        HeartbeatResponse response = heartbeatService.processHeartbeat(authDeviceId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Heartbeat received"));
    }
}
