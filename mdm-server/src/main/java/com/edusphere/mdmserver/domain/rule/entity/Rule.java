package com.edusphere.mdmserver.domain.rule.entity;

import com.edusphere.mdmserver.common.entity.BaseEntity;
import com.edusphere.mdmserver.domain.alert.enums.AlertSeverity;
import com.edusphere.mdmserver.domain.rule.enums.RuleType;
import com.edusphere.mdmserver.domain.school.entity.School;
import com.edusphere.mdmserver.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rule extends BaseEntity {

    @Column(nullable = false)
    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "rule_type", nullable = false)
    private RuleType ruleType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rule_data")
    private Object ruleData;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id")
    private School school;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertSeverity severity;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
}
