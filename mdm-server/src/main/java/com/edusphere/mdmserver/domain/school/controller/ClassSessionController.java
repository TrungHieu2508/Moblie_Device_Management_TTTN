package com.edusphere.mdmserver.domain.school.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.school.dto.ClassSessionDto;
import com.edusphere.mdmserver.domain.school.dto.ScheduleSessionRequest;
import com.edusphere.mdmserver.domain.school.service.ClassSessionService;
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
@RequestMapping("/class-sessions")
@RequiredArgsConstructor
public class ClassSessionController {

    private final ClassSessionService classSessionService;

    @PostMapping("/start")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ClassSessionDto>> startSession(
            @RequestParam UUID classroomId,
            @RequestParam UUID teacherId) {
        ClassSessionDto response = classSessionService.startSession(classroomId, teacherId);
        return ResponseEntity.ok(ApiResponse.success(response, "Session started successfully"));
    }

    @PostMapping("/{sessionId}/end")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ClassSessionDto>> endSession(
            @PathVariable UUID sessionId) {
        ClassSessionDto response = classSessionService.endSession(sessionId);
        return ResponseEntity.ok(ApiResponse.success(response, "Session ended successfully"));
    }

    @PostMapping("/schedule")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ClassSessionDto>> scheduleSession(
            @Valid @RequestBody ScheduleSessionRequest request) {
        ClassSessionDto session = classSessionService.scheduleSession(
                request.getClassroomId(),
                request.getTeacherId(),
                request.getScheduledStartTime(),
                request.getScheduledEndTime()
        );
        return ResponseEntity.ok(ApiResponse.success(session, "Đã lên lịch lớp học"));
    }

    @GetMapping("/scheduled")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'IT_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<ClassSessionDto>>> getScheduledSessions(
            @RequestParam(required = false) UUID schoolId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(classSessionService.getScheduledSessions(schoolId, userDetails), "Success"));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'IT_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<ClassSessionDto>>> getActiveSessions(
            @RequestParam(required = false) UUID schoolId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<ClassSessionDto> response = classSessionService.getActiveSessions(schoolId, userDetails);
        return ResponseEntity.ok(ApiResponse.success(response, "Active sessions retrieved successfully"));
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'IT_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<ClassSessionDto>>> getHistorySessions(
            @RequestParam(required = false) UUID schoolId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<ClassSessionDto> response = classSessionService.getHistorySessions(schoolId, userDetails);
        return ResponseEntity.ok(ApiResponse.success(response, "History sessions retrieved successfully"));
    }
}
