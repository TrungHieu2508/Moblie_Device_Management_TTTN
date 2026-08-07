package com.edusphere.mdmserver.domain.alert.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.alert.dto.AlertStatusUpdateRequest;
import com.edusphere.mdmserver.domain.alert.entity.Alert;
import com.edusphere.mdmserver.domain.alert.enums.AlertStatus;
import com.edusphere.mdmserver.domain.alert.repository.AlertRepository;
import com.edusphere.mdmserver.domain.alert.service.AlertService;
import com.edusphere.mdmserver.domain.user.entity.User;
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
    public ResponseEntity<ApiResponse<Page<Alert>>> getAlerts(
            @RequestParam(required = false) AlertStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Alert> alerts;
        
        if (status != null) {
            alerts = alertRepository.findByStatus(status, pageRequest);
        } else {
            alerts = alertRepository.findAll(pageRequest);
        }
        
        return ResponseEntity.ok(ApiResponse.success(alerts, "Thành công"));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('IT_ADMIN')")
    public ResponseEntity<ApiResponse<Alert>> updateAlertStatus(
            Principal principal,
            @PathVariable UUID id,
            @RequestBody AlertStatusUpdateRequest request) {
        
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User không tồn tại"));
                
        Alert alert = alertService.updateAlertStatus(id, request.getStatus(), request.getResolutionNote(), user);
        
        return ResponseEntity.ok(ApiResponse.success(alert, "Cập nhật Alert thành công"));
    }
}
