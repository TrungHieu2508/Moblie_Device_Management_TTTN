package com.edusphere.mdmserver.domain.alert.entity;

import com.edusphere.mdmserver.common.entity.BaseEntity;
import com.edusphere.mdmserver.domain.alert.enums.AlertSeverity;
import com.edusphere.mdmserver.domain.alert.enums.AlertStatus;
import com.edusphere.mdmserver.domain.device.entity.Device;
import com.edusphere.mdmserver.domain.event.entity.DeviceEvent;
import com.edusphere.mdmserver.domain.rule.entity.Rule;
import com.edusphere.mdmserver.domain.school.entity.Campus;
import com.edusphere.mdmserver.domain.school.entity.Classroom;
import com.edusphere.mdmserver.domain.school.entity.School;
import com.edusphere.mdmserver.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alert extends BaseEntity {

    @Column(name = "alert_code", nullable = false)
    private String alertCode;

    @Column(nullable = false)
    private String title;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertSeverity severity;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AlertStatus status = AlertStatus.NEW;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id")
    private School school;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campus_id")
    private Campus campus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id")
    private Rule rule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private DeviceEvent event;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "event_data")
    private Object eventData;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "resolution_note")
    private String resolutionNote;
}
