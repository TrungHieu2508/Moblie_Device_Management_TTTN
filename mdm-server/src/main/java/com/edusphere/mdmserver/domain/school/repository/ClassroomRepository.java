package com.edusphere.mdmserver.domain.school.repository;

import com.edusphere.mdmserver.domain.school.entity.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassroomRepository extends JpaRepository<Classroom, UUID> {
    List<Classroom> findByCampusId(UUID campusId);
    Optional<Classroom> findByCode(String code);
    boolean existsByCode(String code);
}
