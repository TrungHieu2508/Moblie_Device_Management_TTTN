package com.edusphere.mdmserver.domain.school.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.school.dto.CreateSchoolRequest;
import com.edusphere.mdmserver.domain.school.dto.SchoolDto;
import com.edusphere.mdmserver.domain.school.service.SchoolService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.edusphere.mdmserver.security.CustomUserDetails;
import com.edusphere.mdmserver.domain.user.enums.UserRole;

import java.util.UUID;

@RestController
@RequestMapping("/schools")
@RequiredArgsConstructor
public class SchoolController {

    private final SchoolService schoolService;

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<SchoolDto>> createSchool(@Valid @RequestBody CreateSchoolRequest request) {
        SchoolDto response = schoolService.createSchool(request);
        return ResponseEntity.ok(ApiResponse.success(response, "School created successfully"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'IT_ADMIN')")
    public ResponseEntity<ApiResponse<Page<SchoolDto>>> getAllSchools(
            @RequestParam(required = false) UUID campusId,
            Pageable pageable, 
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        UUID filterCampusId = campusId;
        if (userDetails.getUser().getRole() == UserRole.IT_ADMIN) {
            if (userDetails.getUser().getCampus() == null) {
                return ResponseEntity.ok(ApiResponse.success(Page.empty(), "IT_ADMIN hasn't been assigned to a campus"));
            }
            filterCampusId = userDetails.getUser().getCampus().getId();
        }
        
        Page<SchoolDto> response = schoolService.getAllSchools(pageable, filterCampusId);
        return ResponseEntity.ok(ApiResponse.success(response, "Success"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'IT_ADMIN')")
    public ResponseEntity<ApiResponse<SchoolDto>> getSchoolById(@PathVariable UUID id) {
        SchoolDto response = schoolService.getSchoolById(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Success"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<SchoolDto>> updateSchool(
            @PathVariable UUID id,
            @Valid @RequestBody CreateSchoolRequest request) {
        SchoolDto response = schoolService.updateSchool(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "School updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteSchool(@PathVariable UUID id) {
        schoolService.deleteSchool(id);
        return ResponseEntity.ok(ApiResponse.success(null, "School deleted successfully"));
    }
}
