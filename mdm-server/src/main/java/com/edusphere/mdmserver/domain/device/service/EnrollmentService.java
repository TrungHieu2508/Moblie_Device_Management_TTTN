package com.edusphere.mdmserver.domain.device.service;

import com.edusphere.mdmserver.domain.device.dto.CreateEnrollmentRequest;
import com.edusphere.mdmserver.domain.device.dto.EnrollmentDto;
import com.edusphere.mdmserver.domain.device.entity.EnrollmentProfile;
import com.edusphere.mdmserver.domain.device.repository.EnrollmentProfileRepository;
import com.edusphere.mdmserver.domain.school.entity.Campus;
import com.edusphere.mdmserver.domain.school.entity.School;
import com.edusphere.mdmserver.domain.school.repository.CampusRepository;
import com.edusphere.mdmserver.domain.school.repository.SchoolRepository;
import com.edusphere.mdmserver.domain.school.entity.Classroom;
import com.edusphere.mdmserver.domain.school.repository.ClassroomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnrollmentService {

    private final EnrollmentProfileRepository enrollmentRepository;
    private final CampusRepository campusRepository;
    private final SchoolRepository schoolRepository;
    private final ClassroomRepository classroomRepository;

    @Transactional
    public EnrollmentDto createEnrollmentProfile(CreateEnrollmentRequest request) {
        Campus campus = campusRepository.findById(request.getCampusId())
                .orElseThrow(() -> new IllegalArgumentException("Campus not found"));
        School school = schoolRepository.findById(request.getSchoolId())
                .orElseThrow(() -> new IllegalArgumentException("School not found"));
        
        Classroom classroom = null;
        if (request.getClassroomId() != null) {
            classroom = classroomRepository.findById(request.getClassroomId())
                    .orElseThrow(() -> new IllegalArgumentException("Classroom not found"));
        }

        int expiresDays = (request.getExpiresInDays() != null && request.getExpiresInDays() > 0) 
                ? request.getExpiresInDays() : 7;
        
        int maxUses = (request.getMaxUses() != null && request.getMaxUses() > 0) 
                ? request.getMaxUses() : 0;

        // Generate a random 6-character alphanumeric code
        String code = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        
        // Ensure unique
        while (enrollmentRepository.findByCode(code).isPresent()) {
            code = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        }

        EnrollmentProfile profile = EnrollmentProfile.builder()
                .code(code)
                .campus(campus)
                .school(school)
                .classroom(classroom)
                .expiresAt(Instant.now().plus(expiresDays, ChronoUnit.DAYS))
                .maxUses(maxUses)
                .currentUses(0)
                .isActive(true)
                .build();

        return mapToDto(enrollmentRepository.save(profile));
    }

    @Transactional(readOnly = true)
    public List<EnrollmentDto> getActiveEnrollments(UUID campusId) {
        List<EnrollmentProfile> profiles;
        if (campusId != null) {
            profiles = enrollmentRepository.findAllByCampusIdAndIsActiveTrueOrderByCreatedAtDesc(campusId);
        } else {
            profiles = enrollmentRepository.findAllByIsActiveTrueOrderByCreatedAtDesc();
        }
        
        return profiles.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteEnrollment(UUID id) {
        EnrollmentProfile profile = enrollmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Enrollment profile not found"));
        // Soft delete
        profile.setActive(false);
        enrollmentRepository.save(profile);
    }

    private EnrollmentDto mapToDto(EnrollmentProfile profile) {
        return EnrollmentDto.builder()
                .id(profile.getId())
                .code(profile.getCode())
                .campusId(profile.getCampus().getId())
                .campusName(profile.getCampus().getName())
                .schoolId(profile.getSchool().getId())
                .schoolName(profile.getSchool().getName())
                .classroomId(profile.getClassroom() != null ? profile.getClassroom().getId() : null)
                .classroomName(profile.getClassroom() != null ? profile.getClassroom().getName() : null)
                .expiresAt(profile.getExpiresAt())
                .maxUses(profile.getMaxUses())
                .currentUses(profile.getCurrentUses())
                .isActive(profile.isActive())
                .build();
    }
}
