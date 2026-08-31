package com.edusphere.mdmserver.domain.device.dto;

import com.edusphere.mdmserver.domain.device.enums.DeviceStatus;
import com.edusphere.mdmserver.domain.school.dto.CampusDto;
import com.edusphere.mdmserver.domain.school.dto.ClassroomDto;
import com.edusphere.mdmserver.domain.school.dto.SchoolDto;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class DeviceDto {
    private UUID id;
    private String deviceId;
    private String deviceName;
    private String serialNumber;
    private String model;
    private String androidVersion;
    private String agentVersion;
    private DeviceStatus status;
    private SchoolDto school;
    private CampusDto campus;
    private ClassroomDto classroom;
    private Instant lastHeartbeatAt;
    
    // TODO: Include metrics later when Heartbeat logic is done
}
