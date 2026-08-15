package com.edusphere.mdmserver.domain.device.repository;

import com.edusphere.mdmserver.domain.device.entity.Device;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;
import com.edusphere.mdmserver.domain.device.enums.DeviceStatus;

@Repository
public interface DeviceRepository extends JpaRepository<Device, UUID> {
    Optional<Device> findByDeviceId(String deviceId);
    
    List<Device> findByStatusIn(List<DeviceStatus> statuses);

    @Query("SELECT d.deviceId FROM Device d WHERE d.status IN :statuses")
    org.springframework.data.domain.Slice<String> findDeviceIdsByStatusIn(@Param("statuses") List<DeviceStatus> statuses, Pageable pageable);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Device d SET d.status = :newStatus WHERE d.deviceId IN :deviceIds")
    void updateStatusForDeviceIds(@Param("newStatus") DeviceStatus newStatus, @Param("deviceIds") List<String> deviceIds);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Device d SET d.status = CASE WHEN d.status = 'OFFLINE' THEN 'ONLINE' ELSE d.status END, d.lastHeartbeatAt = :time WHERE d.deviceId = :deviceId")
    void updateHeartbeat(@Param("deviceId") String deviceId, @Param("time") java.time.Instant time);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"school", "campus", "classroom"})
    @Query("SELECT d FROM Device d " +
            "WHERE (:schoolId IS NULL OR d.school.id = :schoolId) " +
            "AND (:campusId IS NULL OR d.campus.id = :campusId) " +
            "AND (:classroomId IS NULL OR d.classroom.id = :classroomId) " +
            "AND (CAST(:androidVersion AS text) IS NULL OR d.androidVersion = CAST(:androidVersion AS text)) " +
            "AND (CAST(:status AS text) IS NULL OR CAST(d.status AS text) = CAST(:status AS text)) " +
            "AND (LOWER(COALESCE(d.deviceName, '')) LIKE LOWER(CONCAT('%', CAST(:search AS text), '%')) OR LOWER(d.deviceId) LIKE LOWER(CONCAT('%', CAST(:search AS text), '%')))")
    Page<Device> searchDevices(
            @Param("schoolId") UUID schoolId,
            @Param("campusId") UUID campusId,
            @Param("classroomId") UUID classroomId,
            @Param("status") String status,
            @Param("search") String search,
            @Param("androidVersion") String androidVersion,
            Pageable pageable
    );

    @Query("SELECT d.status, COUNT(d) FROM Device d GROUP BY d.status")
    List<Object[]> countDevicesByStatus();
}
