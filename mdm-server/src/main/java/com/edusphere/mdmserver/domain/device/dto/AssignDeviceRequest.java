package com.edusphere.mdmserver.domain.device.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class AssignDeviceRequest {
    @NotNull(message = "ID của trường không được để trống")
    private UUID schoolId;
    
    @NotNull(message = "ID của cơ sở không được để trống")
    private UUID campusId;
    
    @NotNull(message = "ID của lớp học không được để trống")
    private UUID classroomId;
    
    private String deviceName;
}
