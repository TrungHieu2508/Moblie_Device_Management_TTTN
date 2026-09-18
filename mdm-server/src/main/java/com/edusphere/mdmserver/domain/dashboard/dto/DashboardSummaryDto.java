package com.edusphere.mdmserver.domain.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDto {
    private long totalDevices;
    private long onlineDevices;
    private long offlineDevices;
    private long warningDevices;
    private long criticalDevices;
    
    private long unresolvedAlerts;
    
    private double safetyIndex; // e.g. 98.5

    private List<ViolationDataDto> violationData;
}
