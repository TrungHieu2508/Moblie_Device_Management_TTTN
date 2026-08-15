package com.edusphere.mdmserver.domain.dashboard.service;

import com.edusphere.mdmserver.domain.alert.enums.AlertStatus;
import com.edusphere.mdmserver.domain.alert.repository.AlertRepository;
import com.edusphere.mdmserver.domain.dashboard.dto.DashboardSummaryDto;
import com.edusphere.mdmserver.domain.device.enums.DeviceStatus;
import com.edusphere.mdmserver.domain.device.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final DeviceRepository deviceRepository;
    private final AlertRepository alertRepository;

    public DashboardSummaryDto getSummary() {
        long totalDevices = deviceRepository.count();
        
        long onlineDevices = 0;
        long offlineDevices = 0;
        long warningDevices = 0;
        long criticalDevices = 0;

        List<Object[]> statusCounts = deviceRepository.countDevicesByStatus();
        for (Object[] row : statusCounts) {
            DeviceStatus status = (DeviceStatus) row[0];
            long count = ((Number) row[1]).longValue();
            
            switch (status) {
                case ONLINE:
                    onlineDevices += count;
                    break;
                case OFFLINE:
                    offlineDevices += count;
                    break;
                case WARNING:
                    warningDevices += count;
                    break;
                case CRITICAL:
                    criticalDevices += count;
                    break;
            }
        }

        long unresolvedAlerts = alertRepository.countByStatus(AlertStatus.NEW) + alertRepository.countByStatus(AlertStatus.PROCESSING);

        double safetyIndex = 100.0;
        if (totalDevices > 0) {
            long problematicDevices = warningDevices + criticalDevices;
            safetyIndex = Math.max(0.0, 100.0 - ((double) problematicDevices / totalDevices * 100.0));
        }

        return DashboardSummaryDto.builder()
                .totalDevices(totalDevices)
                .onlineDevices(onlineDevices)
                .offlineDevices(offlineDevices)
                .warningDevices(warningDevices)
                .criticalDevices(criticalDevices)
                .unresolvedAlerts(unresolvedAlerts)
                .safetyIndex(Math.round(safetyIndex * 10.0) / 10.0) // Round to 1 decimal
                .build();
    }
}
