package com.edusphere.mdmserver.domain.device.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "device_metrics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeviceMetrics {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false, unique = true)
    private Device device;

    @Column(name = "ram_total_mb") private Integer ramTotalMb;
    @Column(name = "ram_used_mb") private Integer ramUsedMb;
    @Column(name = "ram_usage_pct") private BigDecimal ramUsagePct;
    @Column(name = "cpu_usage_pct") private BigDecimal cpuUsagePct;
    @Column(name = "storage_total_gb") private BigDecimal storageTotalGb;
    @Column(name = "storage_used_gb") private BigDecimal storageUsedGb;
    @Column(name = "battery_level") private Integer batteryLevel;
    @Column(name = "battery_charging") private Boolean batteryCharging;
    @Column(name = "wifi_ssid") private String wifiSsid;
    @Column(name = "wifi_signal") private Integer wifiSignal;
    @Column(name = "ip_address") private String ipAddress;
    @Column(name = "current_app") private String currentApp;
    @Column(name = "current_app_name") private String currentAppName;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
