package com.edusphere.mdmserver.domain.device.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.device.dto.CreateEnrollmentRequest;
import com.edusphere.mdmserver.domain.device.dto.EnrollmentDto;
import com.edusphere.mdmserver.domain.device.service.EnrollmentService;
import com.edusphere.mdmserver.domain.user.entity.User;
import com.edusphere.mdmserver.domain.user.enums.UserRole;
import com.edusphere.mdmserver.domain.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentService enrollmentService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('IT_ADMIN')")
    public ResponseEntity<ApiResponse<EnrollmentDto>> createEnrollment(
            @Valid @RequestBody CreateEnrollmentRequest request) {
        EnrollmentDto response = enrollmentService.createEnrollmentProfile(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Enrollment profile created"));
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('IT_ADMIN')")
    public ResponseEntity<ApiResponse<List<EnrollmentDto>>> getActiveEnrollments(Principal principal) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User khong ton tai"));

        UUID campusId = null;
        if (user.getRole() == UserRole.IT_ADMIN) {
            if (user.getCampus() != null) {
                campusId = user.getCampus().getId();
            } else {
                return ResponseEntity.ok(ApiResponse.success(List.of(), "Success"));
            }
        }

        List<EnrollmentDto> response = enrollmentService.getActiveEnrollments(campusId);
        return ResponseEntity.ok(ApiResponse.success(response, "Success"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('IT_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteEnrollment(@PathVariable java.util.UUID id) {
        enrollmentService.deleteEnrollment(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Deleted successfully"));
    }
}
