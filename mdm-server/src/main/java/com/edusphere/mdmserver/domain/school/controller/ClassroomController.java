package com.edusphere.mdmserver.domain.school.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.school.dto.ClassroomDto;
import com.edusphere.mdmserver.domain.school.dto.CreateClassroomRequest;
import com.edusphere.mdmserver.domain.school.service.ClassroomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.edusphere.mdmserver.security.CustomUserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class ClassroomController {

    private final ClassroomService classroomService;

    @PostMapping("/schools/{schoolId}/classrooms")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ClassroomDto>> createClassroom(
            @PathVariable UUID schoolId,
            @Valid @RequestBody CreateClassroomRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        request.setSchoolId(schoolId);
        ClassroomDto response = classroomService.createClassroom(request, userDetails);
        return ResponseEntity.ok(ApiResponse.success(response, "Classroom created successfully"));
    }

    @GetMapping("/schools/{schoolId}/classrooms")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'IT_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<ClassroomDto>>> getClassroomsBySchoolId(
            @PathVariable UUID schoolId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<ClassroomDto> response = classroomService.getClassroomsBySchoolId(schoolId, userDetails);
        return ResponseEntity.ok(ApiResponse.success(response, "Success"));
    }

    @PutMapping("/classrooms/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ClassroomDto>> updateClassroom(
            @PathVariable UUID id,
            @Valid @RequestBody CreateClassroomRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ClassroomDto response = classroomService.updateClassroom(id, request, userDetails);
        return ResponseEntity.ok(ApiResponse.success(response, "Classroom updated successfully"));
    }

    @DeleteMapping("/classrooms/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteClassroom(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        classroomService.deleteClassroom(id, userDetails);
        return ResponseEntity.ok(ApiResponse.success(null, "Classroom deleted successfully"));
    }
}
