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
@RequestMapping("/campuses")
@RequiredArgsConstructor
public class CampusController {

    private final CampusService campusService;

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<CampusDto>> createCampus(
            @Valid @RequestBody CreateCampusRequest request) {
        CampusDto response = campusService.createCampus(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Campus created successfully"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'IT_ADMIN')")
    public ResponseEntity<ApiResponse<List<CampusDto>>> getAllCampuses() {
        List<CampusDto> response = campusService.getAllCampuses();
        return ResponseEntity.ok(ApiResponse.success(response, "Success"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<CampusDto>> updateCampus(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCampusRequest request) {
        CampusDto response = campusService.updateCampus(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Campus updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteCampus(@PathVariable UUID id) {
        campusService.deleteCampus(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Campus deleted successfully"));
    }
}
