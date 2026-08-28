package com.edusphere.mdmserver.domain.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StreamFrame {
    private String deviceId;
    private String frame; // Base64 encoded JPEG
}
