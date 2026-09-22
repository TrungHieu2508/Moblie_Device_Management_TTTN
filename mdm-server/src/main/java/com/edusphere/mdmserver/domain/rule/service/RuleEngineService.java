package com.edusphere.mdmserver.domain.rule.service;

import com.edusphere.mdmserver.domain.alert.service.AlertService;
import com.edusphere.mdmserver.domain.device.entity.Device;
import com.edusphere.mdmserver.domain.event.enums.EventType;
import com.edusphere.mdmserver.domain.rule.entity.Rule;
import com.edusphere.mdmserver.domain.rule.enums.RuleType;
import com.edusphere.mdmserver.domain.rule.dto.CachedRule;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RuleEngineService {

    private final RuleCacheService ruleCacheService;
    private final AlertService alertService;
    private final com.edusphere.mdmserver.domain.command.service.CommandService commandService;

    /**
     * Chạy bất đồng bộ (Async) để không làm nghẽn Event Pipeline
     */
    @Async("taskExecutor")
    public void evaluateEvent(Device device, EventType eventType, Object eventData) {
        log.debug("Evaluating Event {} for Device {}", eventType, device.getDeviceId());
        
        UUID schoolId = device.getSchool() != null ? device.getSchool().getId() : null;

        // 1. Phân loại theo EventType
        if (eventType == EventType.BLACKLIST_APP_DETECTED) {
            alertService.createAgentGeneratedAlert(device, eventData);
        } else if (eventType == EventType.APP_OPENED) {
            evaluateAppRules(device, eventData, schoolId);
        } else if (eventType == EventType.RAM_HIGH || eventType == EventType.CPU_HIGH) {
            evaluateMetricsRules(device, eventData, schoolId);
        }
        // Có thể mở rộng thêm các logic khác tại đây
    }

    private void evaluateAppRules(Device device, Object eventData, UUID schoolId) {
        try {
            if (!(eventData instanceof Map)) return;
            Map<String, Object> data = (Map<String, Object>) eventData;
            String packageName = (String) data.get("packageName");
            String appName = (String) data.getOrDefault("appName", packageName);

            if (packageName == null) return;

            List<CachedRule> blacklistRules = ruleCacheService.getRulesBySchoolAndType(schoolId, RuleType.APP_BLACKLIST);
            
            for (CachedRule cachedRule : blacklistRules) {
                // O(1) Check using HashSet!
                if (cachedRule.getBlacklistApps() != null && cachedRule.getBlacklistApps().contains(packageName)) {
                    Rule rule = cachedRule.getRule();
                    String title = "Phát hiện ứng dụng bị cấm: " + appName;
                    String desc = "Thiết bị vừa mở ứng dụng " + appName + " (" + packageName + ") nằm trong danh sách cấm của Rule: " + rule.getName();
                    alertService.createAlert(device, rule, eventData, title, desc);
                    
                    // Phát hiện vi phạm -> Tự động hú còi sau 5 giây
                    java.util.concurrent.CompletableFuture.delayedExecutor(5, java.util.concurrent.TimeUnit.SECONDS).execute(() -> {
                        try {
                            com.edusphere.mdmserver.domain.command.dto.CommandCreateRequest alarmReq = new com.edusphere.mdmserver.domain.command.dto.CommandCreateRequest();
                            alarmReq.setCommandType(com.edusphere.mdmserver.domain.command.enums.CommandType.RING_ALARM);
                            commandService.createCommand(device.getId(), alarmReq, "system");
                            
                            com.edusphere.mdmserver.domain.command.dto.CommandCreateRequest lockReq = new com.edusphere.mdmserver.domain.command.dto.CommandCreateRequest();
                            lockReq.setCommandType(com.edusphere.mdmserver.domain.command.enums.CommandType.LOCK_SCREEN);
                            commandService.createCommand(device.getId(), lockReq, "system");
                            
                            log.info("Auto-Policy triggered ALARM and LOCK for device {}", device.getDeviceId());
                        } catch (Exception ex) {
                            log.error("Failed to execute auto-policy", ex);
                        }
                    });
                    
                    // Break after first match to avoid generating multiple alerts for the same app
                    break;
                }
            }
        } catch (Exception e) {
            log.error("Error evaluating APP rules for device {}", device.getDeviceId(), e);
        }
    }

    private void evaluateMetricsRules(Device device, Object eventData, UUID schoolId) {
        try {
            if (!(eventData instanceof Map)) return;
            Map<String, Object> metrics = (Map<String, Object>) eventData;
            
            // Check RAM Threshold
            if (metrics.containsKey("ramUsagePct")) {
                double ramUsagePct = Double.parseDouble(metrics.get("ramUsagePct").toString());
                
                List<CachedRule> ramRules = ruleCacheService.getRulesBySchoolAndType(schoolId, RuleType.RAM_THRESHOLD);
                for (CachedRule cachedRule : ramRules) {
                    if (cachedRule.getRamThreshold() != null && ramUsagePct >= cachedRule.getRamThreshold()) {
                        Rule rule = cachedRule.getRule();
                        String title = "Cảnh báo RAM cao";
                        String desc = "Thiết bị đang sử dụng " + ramUsagePct + "% RAM, vượt ngưỡng cho phép (" + cachedRule.getRamThreshold() + "%).";
                        alertService.createAlert(device, rule, eventData, title, desc);
                        break;
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error evaluating METRICS rules for device {}", device.getDeviceId(), e);
        }
    }
}
