package com.edusphere.mdmserver.domain.rule.repository;

import com.edusphere.mdmserver.domain.rule.entity.Rule;
import com.edusphere.mdmserver.domain.rule.enums.RuleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RuleRepository extends JpaRepository<Rule, UUID> {
    List<Rule> findByIsActiveTrue();
    List<Rule> findBySchoolIdAndIsActiveTrue(UUID schoolId);
    List<Rule> findByRuleTypeAndIsActiveTrue(RuleType ruleType);
}
