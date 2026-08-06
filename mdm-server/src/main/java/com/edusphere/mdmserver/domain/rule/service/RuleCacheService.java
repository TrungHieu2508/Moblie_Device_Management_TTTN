package com.edusphere.mdmserver.domain.rule.service;

import com.edusphere.mdmserver.domain.rule.entity.Rule;
import com.edusphere.mdmserver.domain.rule.enums.RuleType;
import com.edusphere.mdmserver.domain.rule.repository.RuleRepository;
import com.edusphere.mdmserver.domain.rule.dto.CachedRule;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RuleCacheService {

    private final RuleRepository ruleRepository;
    private final ObjectMapper objectMapper;

    // Cache structure: Map<SchoolId (or "GLOBAL"), List<CachedRule>>
    private final Map<String, List<CachedRule>> ruleCache = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        refreshCache();
    }

    // Refresh every 5 minutes in case changes were made directly in DB
    @Scheduled(fixedRate = 300000)
    public void scheduledRefresh() {
        refreshCache();
    }

    public void refreshCache() {
        log.info("Refreshing Rule Cache from database...");
        List<Rule> activeRules = ruleRepository.findByIsActiveTrue();
        
        List<CachedRule> cachedRules = activeRules.stream().map(rule -> {
            Map<String, Object> parsedData = null;
            if (rule.getRuleData() != null) {
                try {
                    parsedData = objectMapper.convertValue(rule.getRuleData(), new TypeReference<Map<String, Object>>() {});
                } catch (Exception e) {
                    log.error("Failed to parse rule data for rule {}", rule.getId(), e);
                }
            }
            return new CachedRule(rule, parsedData);
        }).collect(Collectors.toList());

        Map<String, List<CachedRule>> newCache = cachedRules.stream()
                .collect(Collectors.groupingBy(
                        cachedRule -> cachedRule.getRule().getSchool() != null ? cachedRule.getRule().getSchool().getId().toString() : "GLOBAL"
                ));

        ruleCache.clear();
        ruleCache.putAll(newCache);
        
        log.info("Rule Cache refreshed. Loaded {} active rules.", activeRules.size());
    }

    public List<CachedRule> getRulesForSchool(UUID schoolId) {
        List<CachedRule> rules = new ArrayList<>();
        
        // 1. Get Global Rules
        if (ruleCache.containsKey("GLOBAL")) {
            rules.addAll(ruleCache.get("GLOBAL"));
        }
        
        // 2. Get School Specific Rules
        if (schoolId != null && ruleCache.containsKey(schoolId.toString())) {
            rules.addAll(ruleCache.get(schoolId.toString()));
        }
        
        return rules;
    }
    
    public List<CachedRule> getRulesBySchoolAndType(UUID schoolId, RuleType ruleType) {
        return getRulesForSchool(schoolId).stream()
                .filter(cachedRule -> cachedRule.getRule().getRuleType() == ruleType)
                .collect(Collectors.toList());
    }
}
