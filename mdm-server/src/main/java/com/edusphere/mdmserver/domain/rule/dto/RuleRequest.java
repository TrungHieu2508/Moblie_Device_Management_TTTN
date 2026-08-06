package com.edusphere.mdmserver.domain.rule.dto;

import com.edusphere.mdmserver.domain.alert.enums.AlertSeverity;
import com.edusphere.mdmserver.domain.rule.enums.RuleType;
import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
public class RuleRequest {
    private String name;
    private String description;
    private RuleType ruleType;
    private Map<String, Object> ruleData;
    private UUID schoolId;
    private AlertSeverity severity;
}
