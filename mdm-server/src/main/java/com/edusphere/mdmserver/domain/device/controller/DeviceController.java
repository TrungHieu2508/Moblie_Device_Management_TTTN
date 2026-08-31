package com.edusphere.mdmserver.domain.device.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.device.dto.AssignDeviceRequest;
import com.edusphere.mdmserver.domain.device.dto.DeviceDto;
import com.edusphere.mdmserver.domain.device.dto.UpdateDeviceRequest;
import com.edusphere.mdmserver.domain.device.dto.DeviceRegistrationRequest;
import com.edusphere.mdmserver.domain.device.dto.DeviceRegistrationResponse;
import com.edusphere.mdmserver.domain.device.enums.DeviceStatus;
import com.edusphere.mdmserver.domain.device.service.DeviceService;
import com.edusphere.mdmserver.domain.user.entity.User;
import com.edusphere.mdmserver.domain.user.enums.UserRole;
import com.edusphere.mdmserver.domain.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;
    private final UserRepository userRepository;

    // Agent API: Doesn't require prior authentication, permitted in SecurityConfig
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<DeviceRegistrationResponse>> registerDevice(
            @Valid @RequestBody DeviceRegistrationRequest request) {
        DeviceRegistrationResponse response = deviceService.registerDevice(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Device registered successfully"));
    }

    // Admin APIs
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'IT_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Page<DeviceDto>>> getDevices(
            Principal principal,
            @RequestParam(required = false) UUID schoolId,
            @RequestParam(required = false) UUID campusId,
            @RequestParam(required = false) UUID classroomId,
            @RequestParam(required = false) DeviceStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String androidVersion,
            Pageable pageable) {
        
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
                
        // Enforce RBAC: IT_ADMIN can only see devices in their campus
        if (user.getRole() == UserRole.IT_ADMIN) {
            if (user.getCampus() != null) {
                campusId = user.getCampus().getId();
            } else {
                // If IT_ADMIN has no campus assigned yet, they shouldn't see any devices
                return ResponseEntity.ok(ApiResponse.success(Page.empty(), "Success"));
            }
        }
        
        if (search == null) {
            search = "";
        }
        
        Page<DeviceDto> response = deviceService.getDevices(schoolId, campusId, classroomId, status, search, androidVersion, pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Success"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'IT_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<DeviceDto>> getDeviceById(@PathVariable UUID id) {
        DeviceDto response = deviceService.getDeviceById(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Success"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<DeviceDto>> updateDevice(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateDeviceRequest request) {
        DeviceDto response = deviceService.updateDevice(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Device updated successfully"));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<DeviceDto>> assignDevice(
            @PathVariable UUID id,
            @Valid @RequestBody AssignDeviceRequest request) {
        DeviceDto response = deviceService.assignDevice(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Device assigned successfully"));
    }

    @PatchMapping("/{id}/unassign")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<DeviceDto>> unassignDevice(@PathVariable UUID id) {
        DeviceDto response = deviceService.unassignDevice(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Device unassigned successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteDevice(@PathVariable UUID id) {
        deviceService.deleteDevice(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Device deleted successfully"));
    }
}
