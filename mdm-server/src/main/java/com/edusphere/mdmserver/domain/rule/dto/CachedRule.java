package com.edusphere.mdmserver.domain.rule.dto;

import com.edusphere.mdmserver.domain.rule.entity.Rule;
import lombok.Getter;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Getter
public class CachedRule {
    private final Rule rule;
    
    // Pre-parsed data for O(1) evaluation
    private Set<String> blacklistApps;
    private Double ramThreshold;

    public CachedRule(Rule rule, Map<String, Object> parsedRuleData) {
        this.rule = rule;
        
        if (parsedRuleData != null) {
            switch (rule.getRuleType()) {
                case APP_BLACKLIST:
                    Object appsObj = parsedRuleData.get("apps");
                    if (appsObj instanceof List) {
                        this.blacklistApps = new HashSet<>((List<String>) appsObj);
                    } else {
                        this.blacklistApps = new HashSet<>();
                    }
                    break;
                case RAM_THRESHOLD:
                    Object thresholdObj = parsedRuleData.get("threshold");
                    if (thresholdObj != null) {
                        this.ramThreshold = Double.parseDouble(thresholdObj.toString());
                    }
                    break;
                // Add more pre-parsing logic for other rule types here
                default:
                    break;
            }
        }
    }
}
