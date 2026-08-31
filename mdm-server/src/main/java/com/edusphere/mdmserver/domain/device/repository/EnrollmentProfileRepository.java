package com.edusphere.mdmserver.domain.device.repository;

import com.edusphere.mdmserver.domain.device.entity.EnrollmentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface EnrollmentProfileRepository extends JpaRepository<EnrollmentProfile, UUID> {
    Optional<EnrollmentProfile> findByCode(String code);
    
    // Optionally fetch by campus/school for listing
    List<EnrollmentProfile> findAllByIsActiveTrueOrderByCreatedAtDesc();

    List<EnrollmentProfile> findAllByCampusIdAndIsActiveTrueOrderByCreatedAtDesc(UUID campusId);
}
