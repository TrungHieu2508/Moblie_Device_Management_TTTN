package com.edusphere.mdmserver.domain.alert.repository;

import com.edusphere.mdmserver.domain.alert.entity.Alert;
import com.edusphere.mdmserver.domain.alert.enums.AlertStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AlertRepository extends JpaRepository<Alert, UUID> {
    Page<Alert> findByStatus(AlertStatus status, Pageable pageable);
    Page<Alert> findByCampusId(UUID campusId, Pageable pageable);
    Page<Alert> findByCampusIdAndStatus(UUID campusId, AlertStatus status, Pageable pageable);
    List<Alert> findByDeviceIdAndStatus(UUID deviceId, AlertStatus status);
    boolean existsByDeviceIdAndRuleIdAndStatusIn(UUID deviceId, UUID ruleId, List<AlertStatus> statuses);
    boolean existsByDeviceIdAndStatusIn(UUID deviceId, List<AlertStatus> statuses);
    
    long countByStatus(AlertStatus status);
}
