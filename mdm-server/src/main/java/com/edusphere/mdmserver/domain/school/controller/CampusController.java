package com.edusphere.mdmserver.domain.school.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.school.dto.CampusDto;
import com.edusphere.mdmserver.domain.school.dto.CreateCampusRequest;
import com.edusphere.mdmserver.domain.school.service.CampusService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class CampusController {

    private final CampusService campusService;

    @PostMapping("/schools/{schoolId}/campuses")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<CampusDto>> createCampus(
            @PathVariable UUID schoolId,
            @Valid @RequestBody CreateCampusRequest request) {
        request.setSchoolId(schoolId);
        CampusDto response = campusService.createCampus(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Campus created successfully"));
    }

    @GetMapping("/schools/{schoolId}/campuses")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'IT_ADMIN')")
    public ResponseEntity<ApiResponse<List<CampusDto>>> getCampusesBySchoolId(@PathVariable UUID schoolId) {
        List<CampusDto> response = campusService.getCampusesBySchoolId(schoolId);
        return ResponseEntity.ok(ApiResponse.success(response, "Success"));
    }

    @PutMapping("/campuses/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<CampusDto>> updateCampus(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCampusRequest request) {
        CampusDto response = campusService.updateCampus(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Campus updated successfully"));
    }

    @DeleteMapping("/campuses/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteCampus(@PathVariable UUID id) {
        campusService.deleteCampus(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Campus deleted successfully"));
    }
}
