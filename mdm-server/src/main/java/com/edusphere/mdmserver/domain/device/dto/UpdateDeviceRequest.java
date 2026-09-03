package com.edusphere.mdmserver.domain.device.dto;

import lombok.Data;
import jakarta.validation.constraints.Size;
import java.util.UUID;

@Data
public class UpdateDeviceRequest {
    @Size(max = 255)
    private String deviceName;

    private String notes;

    private UUID campusId;
    
    private UUID schoolId;
    
    private UUID classroomId;
}
