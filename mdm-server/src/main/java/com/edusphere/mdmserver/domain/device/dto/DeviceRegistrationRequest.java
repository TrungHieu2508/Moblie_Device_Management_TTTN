package com.edusphere.mdmserver.domain.device.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DeviceRegistrationRequest {
    @NotBlank private String deviceId;
    @NotBlank private String deviceName;
    private String serialNumber;
    private String model;
    private String androidVersion;
    private String agentVersion;
    private String macAddress;
    
    private String enrollmentCode;
}
