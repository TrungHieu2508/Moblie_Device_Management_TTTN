package com.edusphere.mdmserver.domain.device.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.device.dto.HeartbeatRequest;
import com.edusphere.mdmserver.domain.device.dto.HeartbeatResponse;
import com.edusphere.mdmserver.domain.device.service.HeartbeatService;
import com.edusphere.mdmserver.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/devices")
@RequiredArgsConstructor
public class HeartbeatController {

    private final HeartbeatService heartbeatService;
    private final JwtService jwtService;

    @PostMapping("/heartbeat")
    public ResponseEntity<ApiResponse<HeartbeatResponse>> receiveHeartbeat(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody HeartbeatRequest request) {
        
        // Extract DeviceId from Token (since Security Filter validated it)
        String token = authHeader.substring(7); // Remove "Device "
        String authDeviceId = jwtService.extractSubject(token);

        HeartbeatResponse response = heartbeatService.processHeartbeat(authDeviceId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Heartbeat received"));
    }
}
