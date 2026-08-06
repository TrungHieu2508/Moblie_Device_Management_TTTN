package com.edusphere.mdmserver.domain.device.entity;

import com.edusphere.mdmserver.common.entity.BaseEntity;
import com.edusphere.mdmserver.domain.device.enums.DeviceStatus;
import com.edusphere.mdmserver.domain.school.entity.Campus;
import com.edusphere.mdmserver.domain.school.entity.Classroom;
import com.edusphere.mdmserver.domain.school.entity.School;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "devices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Device extends BaseEntity {

    @Column(name = "device_id", nullable = false, unique = true)
    private String deviceId;

    @Column(name = "device_name")
    private String deviceName;

    @Column(name = "serial_number")
    private String serialNumber;

    private String model;

    @Column(name = "android_version")
    private String androidVersion;

    @Column(name = "agent_version")
    private String agentVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id")
    private School school;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campus_id")
    private Campus campus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    private Classroom classroom;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DeviceStatus status = DeviceStatus.PENDING;

    @Column(name = "registration_token")
    private String registrationToken;

    @Column(name = "last_heartbeat_at")
    private Instant lastHeartbeatAt;

    @Column(name = "registered_at")
    private Instant registeredAt;

    private String notes;
}
