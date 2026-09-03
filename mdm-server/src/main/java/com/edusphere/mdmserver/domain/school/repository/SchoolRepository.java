package com.edusphere.mdmserver.domain.school.repository;

import com.edusphere.mdmserver.domain.school.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SchoolRepository extends JpaRepository<School, UUID> {
    Optional<School> findByCode(String code);
    boolean existsByCode(String code);
    boolean existsByNameAndCampusId(String name, UUID campusId);
    org.springframework.data.domain.Page<School> findByCampusId(UUID campusId, org.springframework.data.domain.Pageable pageable);
}
