package com.edusphere.mdmserver.domain.school.repository;

import com.edusphere.mdmserver.domain.school.entity.Campus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CampusRepository extends JpaRepository<Campus, UUID> {
    boolean existsByCode(String code);
}
