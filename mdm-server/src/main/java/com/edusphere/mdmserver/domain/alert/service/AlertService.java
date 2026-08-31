package com.edusphere.mdmserver.domain.alert.service;

import com.edusphere.mdmserver.domain.alert.entity.Alert;
import com.edusphere.mdmserver.domain.alert.repository.AlertRepository;
import com.edusphere.mdmserver.domain.device.entity.Device;
import com.edusphere.mdmserver.domain.device.enums.DeviceStatus;
import com.edusphere.mdmserver.domain.device.repository.DeviceRepository;
import com.edusphere.mdmserver.domain.rule.entity.Rule;
import com.edusphere.mdmserver.domain.websocket.service.WebSocketNotificationService;
import com.edusphere.mdmserver.domain.user.entity.User;
import com.edusphere.mdmserver.domain.alert.enums.AlertStatus;
import com.edusphere.mdmserver.domain.alert.dto.AlertDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository alertRepository;
    private final DeviceRepository deviceRepository;
    private final WebSocketNotificationService wsNotificationService;

    @Transactional
    public void createAlert(Device device, Rule rule, Object eventData, String title, String description) {
        
        // DEBOUNCING: Tránh spam hàng nghìn Alert nếu Agent gửi Event liên tục
        boolean hasActiveAlert = alertRepository.existsByDeviceIdAndRuleIdAndStatusIn(
                device.getId(), rule.getId(), List.of(AlertStatus.NEW, AlertStatus.PROCESSING)
        );

        if (hasActiveAlert) {
            log.debug("Active alert already exists for Rule {} on Device {}. Skipping duplication.", rule.getId(), device.getDeviceId());
            return;
        }

        log.warn("Rule Violated! Generating Alert: {} for Device: {}", title, device.getDeviceId());

        Alert alert = Alert.builder()
                .alertCode(rule.getRuleType().name())
                .title(title)
                .description(description)
                .severity(rule.getSeverity())
                .device(device)
                .school(device.getSchool())
                .campus(device.getCampus())
                .classroom(device.getClassroom())
                .rule(rule)
                .eventData(eventData)
                .build();

        alert = alertRepository.save(alert);

        // Update Device Status based on Alert Severity
        if (rule.getSeverity() == com.edusphere.mdmserver.domain.alert.enums.AlertSeverity.CRITICAL) {
            device.setStatus(DeviceStatus.CRITICAL);
        } else if (device.getStatus() != DeviceStatus.CRITICAL) {
            device.setStatus(DeviceStatus.WARNING);
        }
        deviceRepository.save(device);

        // Broadcast to Dashboard
        wsNotificationService.broadcastNewAlert(mapToDto(alert));
    }

    @Transactional(readOnly = true)
    public Page<com.edusphere.mdmserver.domain.alert.dto.AlertDto> getAlerts(UUID campusId, AlertStatus status, Pageable pageRequest) {
        Page<Alert> alerts;
        
        if (campusId != null) {
            if (status != null) {
                alerts = alertRepository.findByCampusIdAndStatus(campusId, status, pageRequest);
            } else {
                alerts = alertRepository.findByCampusId(campusId, pageRequest);
            }
        } else {
            if (status != null) {
                alerts = alertRepository.findByStatus(status, pageRequest);
            } else {
                alerts = alertRepository.findAll(pageRequest);
            }
        }
        
        return alerts.map(this::mapToDto);
    }
    @Transactional
    public void createManualAlert(Device device, String commandType, User adminUser) {
        String title;
        String description;
        com.edusphere.mdmserver.domain.alert.enums.AlertSeverity severity;

        switch (commandType) {
            case "LOCK_SCREEN":
                title = "Khóa màn hình thủ công";
                description = "Quản trị viên " + adminUser.getUsername() + " đã khóa màn hình thiết bị.";
                severity = com.edusphere.mdmserver.domain.alert.enums.AlertSeverity.WARNING;
                device.setStatus(DeviceStatus.WARNING);
                break;
            case "RING_ALARM":
                title = "Phát cảnh báo thủ công";
                description = "Quản trị viên " + adminUser.getUsername() + " đã phát âm thanh cảnh báo trên thiết bị.";
                severity = com.edusphere.mdmserver.domain.alert.enums.AlertSeverity.WARNING;
                device.setStatus(DeviceStatus.WARNING);
                break;
            case "WIPE_DATA":
                title = "Xóa dữ liệu thủ công";
                description = "Quản trị viên " + adminUser.getUsername() + " đã yêu cầu xóa toàn bộ dữ liệu (Factory Reset).";
                severity = com.edusphere.mdmserver.domain.alert.enums.AlertSeverity.CRITICAL;
                device.setStatus(DeviceStatus.CRITICAL);
                break;
            default:
                return; // Không tạo alert cho các lệnh khác (như UNLOCK_DEVICE)
        }

        Alert alert = Alert.builder()
                .alertCode("MANUAL_" + commandType)
                .title(title)
                .description(description)
                .severity(severity)
                .device(device)
                .school(device.getSchool())
                .campus(device.getCampus())
                .classroom(device.getClassroom())
                .build();

        alert = alertRepository.save(alert);
        deviceRepository.save(device);

        // Broadcast to Dashboard
        wsNotificationService.broadcastNewAlert(mapToDto(alert));
    }

    @Transactional
    public Alert updateAlertStatus(UUID alertId, AlertStatus newStatus, String resolutionNote, User resolvedBy) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("Cảnh báo không tồn tại"));

        alert.setStatus(newStatus);
        alert.setResolutionNote(resolutionNote);

        if (newStatus == AlertStatus.RESOLVED || newStatus == AlertStatus.DISMISSED) {
            alert.setResolvedAt(Instant.now());
            alert.setResolvedBy(resolvedBy);

            // Xử lý phục hồi trạng thái Device
            Device device = alert.getDevice();
            boolean hasOtherActiveAlerts = alertRepository.existsByDeviceIdAndStatusIn(
                    device.getId(), List.of(AlertStatus.NEW, AlertStatus.PROCESSING)
            );

            if (!hasOtherActiveAlerts) {
                // Phục hồi về ONLINE nếu không còn cảnh báo nào khác
                device.setStatus(DeviceStatus.ONLINE);
                deviceRepository.save(device);
                log.info("Device {} recovered to ONLINE after all alerts were resolved.", device.getDeviceId());
            }
        }

        alert = alertRepository.save(alert);
        wsNotificationService.broadcastAlertStatusChange(alert.getId().toString(), mapToDto(alert));
        return alert;
    }

    private AlertDto mapToDto(Alert alert) {
        AlertDto dto = AlertDto.builder()
                .id(alert.getId())
                .title(alert.getTitle())
                .description(alert.getDescription())
                .severity(alert.getSeverity())
                .status(alert.getStatus())
                .createdAt(alert.getCreatedAt())
                .build();
                
        if (alert.getDevice() != null) {
            dto.setDevice(AlertDto.DeviceBasicInfo.builder()
                    .id(alert.getDevice().getId())
                    .deviceName(alert.getDevice().getDeviceName())
                    .deviceId(alert.getDevice().getDeviceId())
                    .build());
        }
        return dto;
    }
}
