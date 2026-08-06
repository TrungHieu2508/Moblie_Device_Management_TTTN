package com.edusphere.mdmserver.domain.command.repository;

import com.edusphere.mdmserver.domain.command.entity.DeviceCommand;
import com.edusphere.mdmserver.domain.command.enums.CommandStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface DeviceCommandRepository extends JpaRepository<DeviceCommand, UUID> {

    @Query("SELECT c FROM DeviceCommand c WHERE c.device.id = :deviceId")
    Page<DeviceCommand> findByDeviceId(@Param("deviceId") UUID deviceId, Pageable pageable);

    @Query("SELECT c FROM DeviceCommand c WHERE c.status = 'PENDING' AND c.device.id = :deviceId")
    List<DeviceCommand> findPendingByDeviceId(@Param("deviceId") UUID deviceId);
    
    @Query("SELECT c FROM DeviceCommand c JOIN FETCH c.device WHERE c.status = 'SENT' AND c.sentAt < :threshold")
    List<DeviceCommand> findStuckCommands(@Param("threshold") Instant threshold);
    
    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE DeviceCommand c SET c.status = 'PENDING', c.sentAt = null WHERE c.id IN :commandIds")
    int resetStuckCommands(@Param("commandIds") List<UUID> commandIds);
}
