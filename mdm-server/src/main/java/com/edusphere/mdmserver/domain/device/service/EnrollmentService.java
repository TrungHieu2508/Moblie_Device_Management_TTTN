package com.edusphere.mdmserver.domain.device.service;

import com.edusphere.mdmserver.domain.device.dto.CreateEnrollmentRequest;
import com.edusphere.mdmserver.domain.device.dto.EnrollmentDto;
import com.edusphere.mdmserver.domain.device.entity.EnrollmentProfile;
import com.edusphere.mdmserver.domain.device.repository.EnrollmentProfileRepository;
import com.edusphere.mdmserver.domain.school.entity.Campus;
import com.edusphere.mdmserver.domain.school.entity.School;
import com.edusphere.mdmserver.domain.school.repository.CampusRepository;
import com.edusphere.mdmserver.domain.school.repository.SchoolRepository;
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

    @Transactional
    public EnrollmentDto createEnrollmentProfile(CreateEnrollmentRequest request) {
        Campus campus = campusRepository.findById(request.getCampusId())
                .orElseThrow(() -> new IllegalArgumentException("Campus not found"));
        School school = schoolRepository.findById(request.getSchoolId())
                .orElseThrow(() -> new IllegalArgumentException("School not found"));

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
                .expiresAt(Instant.now().plus(expiresDays, ChronoUnit.DAYS))
                .maxUses(maxUses)
                .currentUses(0)
                .isActive(true)
                .build();

        return mapToDto(enrollmentRepository.save(profile));
    }

    public List<EnrollmentDto> getActiveEnrollments() {
        return enrollmentRepository.findAllByIsActiveTrue().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private EnrollmentDto mapToDto(EnrollmentProfile profile) {
        return EnrollmentDto.builder()
                .id(profile.getId())
                .code(profile.getCode())
                .campusId(profile.getCampus().getId())
                .campusName(profile.getCampus().getName())
                .schoolId(profile.getSchool().getId())
                .schoolName(profile.getSchool().getName())
                .expiresAt(profile.getExpiresAt())
                .maxUses(profile.getMaxUses())
                .currentUses(profile.getCurrentUses())
                .isActive(profile.isActive())
                .build();
    }
}
