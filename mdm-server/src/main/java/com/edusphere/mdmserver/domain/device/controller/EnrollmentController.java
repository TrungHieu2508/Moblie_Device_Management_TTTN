package com.edusphere.mdmserver.domain.device.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.device.dto.CreateEnrollmentRequest;
import com.edusphere.mdmserver.domain.device.dto.EnrollmentDto;
import com.edusphere.mdmserver.domain.device.service.EnrollmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'IT_ADMIN')")
    public ResponseEntity<ApiResponse<EnrollmentDto>> createEnrollment(
            @Valid @RequestBody CreateEnrollmentRequest request) {
        EnrollmentDto response = enrollmentService.createEnrollmentProfile(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Enrollment profile created"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'IT_ADMIN')")
    public ResponseEntity<ApiResponse<List<EnrollmentDto>>> getActiveEnrollments() {
        List<EnrollmentDto> response = enrollmentService.getActiveEnrollments();
        return ResponseEntity.ok(ApiResponse.success(response, "Success"));
    }
}
