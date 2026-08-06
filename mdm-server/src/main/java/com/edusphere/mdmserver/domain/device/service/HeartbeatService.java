package com.edusphere.mdmserver.domain.device.service;

import com.edusphere.mdmserver.domain.device.dto.HeartbeatRequest;
import com.edusphere.mdmserver.domain.device.dto.HeartbeatResponse;
import com.edusphere.mdmserver.domain.device.entity.Device;
import com.edusphere.mdmserver.domain.device.enums.DeviceStatus;
import com.edusphere.mdmserver.domain.device.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class HeartbeatService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final DeviceRepository deviceRepository;

    @Value("${app.device.heartbeat-interval}")
    private int heartbeatIntervalSeconds;

    // The grace period before marking a device as offline
    private static final int OFFLINE_THRESHOLD_SECONDS = 90;

    public HeartbeatResponse processHeartbeat(String authDeviceId, HeartbeatRequest request) {
        if (!authDeviceId.equals(request.getDeviceId())) {
            throw new RuntimeException("Device ID mismatch between token and payload");
        }

        String redisKey = "device:" + request.getDeviceId() + ":status";
        
        // Check if device was previously offline (key doesn't exist)
        Boolean wasOnline = redisTemplate.hasKey(redisKey);
        
        // Save to Redis with a TTL of OFFLINE_THRESHOLD_SECONDS
        redisTemplate.opsForValue().set(redisKey, "ONLINE", Duration.ofSeconds(OFFLINE_THRESHOLD_SECONDS));
        
        // If the device just came back online, sync to DB
        if (Boolean.FALSE.equals(wasOnline)) {
            deviceRepository.findByDeviceId(request.getDeviceId()).ifPresent(device -> {
                if (device.getStatus() == DeviceStatus.OFFLINE) {
                    device.setStatus(DeviceStatus.ONLINE);
                    device.setLastHeartbeatAt(Instant.now());
                    deviceRepository.save(device);
                    log.info("Device {} recovered from OFFLINE to ONLINE", request.getDeviceId());
                }
            });
        }
        
        // Optionally save the latest metrics to Redis as well to show on Dashboard instantly
        String metricsKey = "device:" + request.getDeviceId() + ":metrics";
        redisTemplate.opsForValue().set(metricsKey, request.getMetrics(), Duration.ofSeconds(OFFLINE_THRESHOLD_SECONDS));

        // TODO: Batch persist metrics to PostgreSQL using a background queue/job to avoid DB bottleneck

        // Send response
        return HeartbeatResponse.builder()
                .nextHeartbeatSeconds(heartbeatIntervalSeconds)
                .pendingCommands(0) // TODO: Check for pending commands in Redis/DB
                .build();
    }
}
