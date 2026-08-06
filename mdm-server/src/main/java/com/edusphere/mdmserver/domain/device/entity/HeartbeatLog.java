package com.edusphere.mdmserver.domain.device.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "heartbeat_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HeartbeatLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", nullable = false)
    private UUID deviceId;

    @Column(name = "ram_usage_pct") private BigDecimal ramUsagePct;
    @Column(name = "cpu_usage_pct") private BigDecimal cpuUsagePct;
    @Column(name = "battery_level") private Integer batteryLevel;
    @Column(name = "wifi_connected") private Boolean wifiConnected;
    @Column(name = "current_app") private String currentApp;
    @Column(name = "ip_address") private String ipAddress;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;
}
