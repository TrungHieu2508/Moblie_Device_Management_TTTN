package com.edusphere.mdmserver.domain.device.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class HeartbeatRequest {
    private String deviceId;
    private Instant timestamp;
    private Metrics metrics;
    private CurrentApp currentApp;

    @Data
    public static class Metrics {
        private int ramTotalMb;
        private int ramUsedMb;
        private double ramUsagePct;
        private double cpuUsagePct;
        private double storageTotalGb;
        private double storageUsedGb;
        private int batteryLevel;
        private boolean batteryCharging;
        private String wifiSsid;
        private int wifiSignal;
        private String ipAddress;
    }

    @Data
    public static class CurrentApp {
        private String packageName;
        private String appName;
        private String appIconBase64;
    }
}
