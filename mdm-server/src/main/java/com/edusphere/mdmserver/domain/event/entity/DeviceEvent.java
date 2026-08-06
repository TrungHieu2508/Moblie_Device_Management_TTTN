package com.edusphere.mdmserver.domain.event.entity;

import com.edusphere.mdmserver.domain.device.entity.Device;
import com.edusphere.mdmserver.domain.event.enums.EventType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "device_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeviceEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private EventType eventType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "event_data")
    private Object eventData;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Builder.Default
    private Boolean processed = false;

    @Column(name = "processed_at")
    private Instant processedAt;
}
