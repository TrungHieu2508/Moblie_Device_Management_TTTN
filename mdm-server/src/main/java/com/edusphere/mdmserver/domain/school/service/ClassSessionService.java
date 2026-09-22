package com.edusphere.mdmserver.domain.school.service;

import com.edusphere.mdmserver.domain.school.dto.ClassSessionDto;
import com.edusphere.mdmserver.domain.school.entity.ClassSession;
import com.edusphere.mdmserver.domain.school.entity.Classroom;
import com.edusphere.mdmserver.domain.school.repository.ClassSessionRepository;
import com.edusphere.mdmserver.domain.school.repository.ClassroomRepository;
import com.edusphere.mdmserver.domain.user.entity.User;
import com.edusphere.mdmserver.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import com.edusphere.mdmserver.domain.school.entity.School;
import com.edusphere.mdmserver.domain.school.repository.SchoolRepository;
import com.edusphere.mdmserver.security.CustomUserDetails;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClassSessionService {

    private final ClassSessionRepository classSessionRepository;
    private final ClassroomRepository classroomRepository;
    private final UserRepository userRepository;
    private final SchoolRepository schoolRepository;

    @Transactional
    public ClassSessionDto startSession(UUID classroomId, UUID teacherId) {
        // Check if there's already an active session for this classroom
        classSessionRepository.findByClassroomIdAndStatus(classroomId, "ACTIVE")
                .ifPresent(s -> {
                    throw new RuntimeException("Lớp học này đang diễn ra một buổi học khác");
                });

        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học"));
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        ClassSession session = ClassSession.builder()
                .classroom(classroom)
                .teacher(teacher)
                .status("ACTIVE")
                .startedAt(Instant.now())
                .build();

        return mapToDto(classSessionRepository.save(session));
    }

    @Transactional
    public ClassSessionDto endSession(UUID sessionId) {
        ClassSession session = classSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phiên học"));

        if ("ENDED".equals(session.getStatus()) || "CANCELLED".equals(session.getStatus())) {
            throw new RuntimeException("Phiên học đã kết thúc hoặc bị hủy");
        }

        if ("SCHEDULED".equals(session.getStatus())) {
            session.setStatus("CANCELLED");
        } else {
            session.setStatus("ENDED");
        }
        session.setEndedAt(Instant.now());

        return mapToDto(classSessionRepository.save(session));
    }

    @Transactional
    public ClassSessionDto scheduleSession(UUID classroomId, UUID teacherId, Instant startTime, Instant endTime) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học"));

        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        if (startTime.isAfter(endTime)) {
            throw new RuntimeException("Thời gian bắt đầu phải trước thời gian kết thúc");
        }

        boolean hasOverlap = classSessionRepository.existsOverlappingSession(
                classroomId, 
                startTime, 
                endTime, 
                java.util.Arrays.asList("SCHEDULED", "ACTIVE")
        );
        if (hasOverlap) {
            throw new RuntimeException("Lớp học này đã có lịch học trùng với khung giờ bạn chọn");
        }

        ClassSession session = ClassSession.builder()
                .classroom(classroom)
                .teacher(teacher)
                .status("SCHEDULED")
                .scheduledStartTime(startTime)
                .scheduledEndTime(endTime)
                .build();

        return mapToDto(classSessionRepository.save(session));
    }

    @Transactional(readOnly = true)
    public List<ClassSessionDto> getScheduledSessions(UUID requestedSchoolId, CustomUserDetails userDetails) {
        if (userDetails.getUser().getRole() == com.edusphere.mdmserver.domain.user.entity.Role.TEACHER) {
            return classSessionRepository.findByTeacherIdAndStatus(userDetails.getUser().getId(), "SCHEDULED")
                    .stream().map(this::mapToDto).collect(Collectors.toList());
        }

        UUID effectiveSchoolId = determineEffectiveSchoolId(requestedSchoolId, userDetails);
        
        List<ClassSession> sessions = effectiveSchoolId != null 
            ? classSessionRepository.findByClassroomSchoolIdAndStatus(effectiveSchoolId, "SCHEDULED")
            : classSessionRepository.findByStatus("SCHEDULED");
            
        return sessions.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ClassSessionDto> getActiveSessions(UUID requestedSchoolId, CustomUserDetails userDetails) {
        if (userDetails.getUser().getRole() == com.edusphere.mdmserver.domain.user.entity.Role.TEACHER) {
            return classSessionRepository.findByTeacherIdAndStatus(userDetails.getUser().getId(), "ACTIVE")
                    .stream().map(this::mapToDto).collect(Collectors.toList());
        }

        UUID effectiveSchoolId = determineEffectiveSchoolId(requestedSchoolId, userDetails);
        
        List<ClassSession> sessions = effectiveSchoolId != null 
            ? classSessionRepository.findByClassroomSchoolIdAndStatus(effectiveSchoolId, "ACTIVE")
            : classSessionRepository.findByStatus("ACTIVE");

        return sessions.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ClassSessionDto> getHistorySessions(UUID requestedSchoolId, CustomUserDetails userDetails) {
        List<String> statuses = java.util.Arrays.asList("ENDED", "CANCELLED");

        if (userDetails.getUser().getRole() == com.edusphere.mdmserver.domain.user.entity.Role.TEACHER) {
            return classSessionRepository.findByTeacherIdAndStatusIn(userDetails.getUser().getId(), statuses)
                    .stream()
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .map(this::mapToDto)
                    .collect(Collectors.toList());
        }

        UUID effectiveSchoolId = determineEffectiveSchoolId(requestedSchoolId, userDetails);
        
        List<ClassSession> history = effectiveSchoolId != null
            ? classSessionRepository.findByClassroomSchoolIdAndStatusIn(effectiveSchoolId, statuses)
            : classSessionRepository.findByStatus("ENDED"); // We will fix this in the next chunk

        if (effectiveSchoolId == null) {
            List<ClassSession> cancelled = classSessionRepository.findByStatus("CANCELLED");
            history = new java.util.ArrayList<>(history);
            history.addAll(cancelled);
        }
        
        return history.stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private UUID determineEffectiveSchoolId(UUID requestedSchoolId, CustomUserDetails userDetails) {
        switch (userDetails.getUser().getRole()) {
            case TEACHER:
                if (userDetails.getUser().getSchool() == null) {
                    throw new AccessDeniedException("Giáo viên chưa được gán vào trường nào");
                }
                return userDetails.getUser().getSchool().getId();
            case IT_ADMIN:
                if (requestedSchoolId != null) {
                    School school = schoolRepository.findById(requestedSchoolId)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy trường học"));
                    if (school.getCampus() == null || userDetails.getUser().getCampus() == null || 
                        !school.getCampus().getId().equals(userDetails.getUser().getCampus().getId())) {
                        throw new AccessDeniedException("Trường học này không thuộc khu vực bạn quản lý");
                    }
                    return requestedSchoolId;
                }
                // If they don't specify a school, we should ideally return only schools in their campus.
                // For simplicity, we can just throw if they try to fetch all, or we could fetch by campus.
                // The current architecture doesn't have findByCampus easily here. 
                // Let's assume IT_ADMIN must provide a schoolId if they are looking at dashboard.
                // But if they don't, we will throw.
                throw new AccessDeniedException("IT_ADMIN phải chỉ định ID trường học");
            case SUPER_ADMIN:
                return requestedSchoolId; // If null, they see all
            default:
                throw new AccessDeniedException("Quyền truy cập bị từ chối");
        }
    }

    private ClassSessionDto mapToDto(ClassSession session) {
        return ClassSessionDto.builder()
                .id(session.getId())
                .classroomId(session.getClassroom().getId())
                .classroomName(session.getClassroom().getName())
                .teacherId(session.getTeacher().getId())
                .teacherName(session.getTeacher().getFullName())
                .status(session.getStatus())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .scheduledStartTime(session.getScheduledStartTime())
                .scheduledEndTime(session.getScheduledEndTime())
                .build();
    }

    @Transactional
    public void autoManageSessions() {
        Instant now = Instant.now();

        // Auto-start SCHEDULED sessions
        List<ClassSession> scheduledToStart = classSessionRepository.findByStatus("SCHEDULED").stream()
                .filter(s -> s.getScheduledStartTime() != null && !s.getScheduledStartTime().isAfter(now))
                .collect(Collectors.toList());

        for (ClassSession session : scheduledToStart) {
            session.setStatus("ACTIVE");
            session.setStartedAt(now);
            classSessionRepository.save(session);
        }

        // Auto-end ACTIVE sessions
        List<ClassSession> activeToEnd = classSessionRepository.findByStatus("ACTIVE").stream()
                .filter(s -> s.getScheduledEndTime() != null && !s.getScheduledEndTime().isAfter(now))
                .collect(Collectors.toList());

        for (ClassSession session : activeToEnd) {
            session.setStatus("ENDED");
            session.setEndedAt(now);
            classSessionRepository.save(session);
        }
    }
}
