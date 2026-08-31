package com.edusphere.mdmserver.domain.alert.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.alert.dto.AlertStatusUpdateRequest;
import com.edusphere.mdmserver.domain.alert.entity.Alert;
import com.edusphere.mdmserver.domain.alert.enums.AlertStatus;
import com.edusphere.mdmserver.domain.alert.repository.AlertRepository;
import com.edusphere.mdmserver.domain.alert.service.AlertService;
import com.edusphere.mdmserver.domain.user.entity.User;
import com.edusphere.mdmserver.domain.user.enums.UserRole;
import com.edusphere.mdmserver.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertRepository alertRepository;
    private final AlertService alertService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('IT_ADMIN')")
    public ResponseEntity<ApiResponse<Page<com.edusphere.mdmserver.domain.alert.dto.AlertDto>>> getAlerts(
            Principal principal,
            @RequestParam(required = false) AlertStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User không tồn tại"));
                
        // Enforce RBAC for IT_ADMIN
        UUID campusId = null;
        if (user.getRole() == UserRole.IT_ADMIN) {
            if (user.getCampus() != null) {
                campusId = user.getCampus().getId();
            } else {
                return ResponseEntity.ok(ApiResponse.success(Page.empty(), "Thành công"));
            }
        }
        
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        
        Page<com.edusphere.mdmserver.domain.alert.dto.AlertDto> dtoPage = alertService.getAlerts(campusId, status, pageRequest);
        
        return ResponseEntity.ok(ApiResponse.success(dtoPage, "Thành công"));
    }

    private com.edusphere.mdmserver.domain.alert.dto.AlertDto mapToDto(Alert alert) {
        com.edusphere.mdmserver.domain.alert.dto.AlertDto dto = com.edusphere.mdmserver.domain.alert.dto.AlertDto.builder()
                .id(alert.getId())
                .title(alert.getTitle())
                .description(alert.getDescription())
                .severity(alert.getSeverity())
                .status(alert.getStatus())
                .createdAt(alert.getCreatedAt())
                .build();
                
        if (alert.getDevice() != null) {
            dto.setDevice(com.edusphere.mdmserver.domain.alert.dto.AlertDto.DeviceBasicInfo.builder()
                    .id(alert.getDevice().getId())
                    .deviceName(alert.getDevice().getDeviceName())
                    .deviceId(alert.getDevice().getDeviceId())
                    .build());
        }
        return dto;
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('IT_ADMIN')")
    public ResponseEntity<ApiResponse<com.edusphere.mdmserver.domain.alert.dto.AlertDto>> updateAlertStatus(
            Principal principal,
            @PathVariable UUID id,
            @RequestBody AlertStatusUpdateRequest request) {
        
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User không tồn tại"));
                
        Alert alert = alertService.updateAlertStatus(id, request.getStatus(), request.getResolutionNote(), user);
        
        return ResponseEntity.ok(ApiResponse.success(mapToDto(alert), "Cập nhật Alert thành công"));
    }
}
