package com.edusphere.mdmserver.domain.dashboard.service;

import com.edusphere.mdmserver.domain.alert.enums.AlertStatus;
import com.edusphere.mdmserver.domain.alert.repository.AlertRepository;
import com.edusphere.mdmserver.domain.dashboard.dto.DashboardSummaryDto;
import com.edusphere.mdmserver.domain.dashboard.dto.ViolationDataDto;
import com.edusphere.mdmserver.domain.device.enums.DeviceStatus;
import com.edusphere.mdmserver.domain.device.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final DeviceRepository deviceRepository;
    private final AlertRepository alertRepository;
    private final JdbcTemplate jdbcTemplate;

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

        // Generate Violation Data for the last 7 days
        List<ViolationDataDto> violationData = calculateViolationData();

        return DashboardSummaryDto.builder()
                .totalDevices(totalDevices)
                .onlineDevices(onlineDevices)
                .offlineDevices(offlineDevices)
                .warningDevices(warningDevices)
                .criticalDevices(criticalDevices)
                .unresolvedAlerts(unresolvedAlerts)
                .safetyIndex(Math.round(safetyIndex * 10.0) / 10.0)
                .violationData(violationData)
                .build();
    }

    private List<ViolationDataDto> calculateViolationData() {
        List<ViolationDataDto> result = new ArrayList<>();
        LocalDate today = LocalDate.now();

        // 1. Get Game alerts (BLACKLIST_APP_DETECTED) for the last 7 days
        String gameSql = "SELECT DATE(created_at) as log_date, COUNT(*) as cnt " +
                "FROM alerts " +
                "WHERE alert_code = 'BLACKLIST_APP_DETECTED' AND created_at >= ? " +
                "GROUP BY DATE(created_at)";

        // 2. Get Lock commands (LOCK_SCREEN) for the last 7 days
        String lockSql = "SELECT DATE(created_at) as log_date, COUNT(*) as cnt " +
                "FROM remote_commands " +
                "WHERE command_type = 'LOCK_SCREEN' AND created_at >= ? " +
                "GROUP BY DATE(created_at)";

        LocalDate sevenDaysAgo = today.minusDays(6);
        java.sql.Date sqlSevenDaysAgo = java.sql.Date.valueOf(sevenDaysAgo);

        Map<String, Long> gameCounts = jdbcTemplate.queryForList(gameSql, sqlSevenDaysAgo).stream()
                .collect(Collectors.toMap(
                        row -> row.get("log_date").toString(),
                        row -> ((Number) row.get("cnt")).longValue()
                ));

        Map<String, Long> lockCounts = jdbcTemplate.queryForList(lockSql, sqlSevenDaysAgo).stream()
                .collect(Collectors.toMap(
                        row -> row.get("log_date").toString(),
                        row -> ((Number) row.get("cnt")).longValue()
                ));

        String[] dayNames = {"CN", "T2", "T3", "T4", "T5", "T6", "T7"};

        // Generate exactly 7 days ending on today
        for (int i = 6; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            String dateStr = d.toString();
            
            // Format name as Day of week
            String name = dayNames[d.getDayOfWeek().getValue() % 7];
            
            result.add(ViolationDataDto.builder()
                    .name(name)
                    .gaming(gameCounts.getOrDefault(dateStr, 0L))
                    .locked(lockCounts.getOrDefault(dateStr, 0L))
                    .build());
        }

        return result;
    }
}
