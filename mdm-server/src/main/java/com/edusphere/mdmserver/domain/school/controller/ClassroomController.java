package com.edusphere.mdmserver.domain.school.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.school.dto.ClassroomDto;
import com.edusphere.mdmserver.domain.school.dto.CreateClassroomRequest;
import com.edusphere.mdmserver.domain.school.service.ClassroomService;
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
public class ClassroomController {

    private final ClassroomService classroomService;

    @PostMapping("/campuses/{campusId}/classrooms")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<ClassroomDto>> createClassroom(
            @PathVariable UUID campusId,
            @Valid @RequestBody CreateClassroomRequest request) {
        request.setCampusId(campusId);
        ClassroomDto response = classroomService.createClassroom(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Classroom created successfully"));
    }

    @GetMapping("/campuses/{campusId}/classrooms")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'IT_ADMIN')")
    public ResponseEntity<ApiResponse<List<ClassroomDto>>> getClassroomsByCampusId(@PathVariable UUID campusId) {
        List<ClassroomDto> response = classroomService.getClassroomsByCampusId(campusId);
        return ResponseEntity.ok(ApiResponse.success(response, "Success"));
    }

    @PutMapping("/classrooms/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<ClassroomDto>> updateClassroom(
            @PathVariable UUID id,
            @Valid @RequestBody CreateClassroomRequest request) {
        ClassroomDto response = classroomService.updateClassroom(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Classroom updated successfully"));
    }

    @DeleteMapping("/classrooms/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteClassroom(@PathVariable UUID id) {
        classroomService.deleteClassroom(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Classroom deleted successfully"));
    }
}
