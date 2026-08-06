package com.edusphere.mdmserver.domain.device.job;

import com.edusphere.mdmserver.domain.device.entity.Device;
import com.edusphere.mdmserver.domain.device.enums.DeviceStatus;
import com.edusphere.mdmserver.domain.device.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class OfflineDetectionJob {

    private final DeviceRepository deviceRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    // Runs every 60 seconds
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void detectOfflineDevices() {
        log.info("Running OfflineDetectionJob...");
        // Chỉ lấy những thiết bị đang được ghi nhận là ONLINE, WARNING, CRITICAL trong DB
        List<Device> activeDevices = deviceRepository.findByStatusIn(List.of(
                DeviceStatus.ONLINE, 
                DeviceStatus.WARNING, 
                DeviceStatus.CRITICAL
        ));
        
        int offlineCount = 0;
        
        for (Device device : activeDevices) {
            String redisKey = "device:" + device.getDeviceId() + ":status";
            Boolean isOnline = redisTemplate.hasKey(redisKey);
            
            if (Boolean.FALSE.equals(isOnline)) {
                // Key expired in Redis, meaning no heartbeat received within the threshold
                device.setStatus(DeviceStatus.OFFLINE);
                deviceRepository.save(device);
                offlineCount++;
                log.info("Device {} marked as OFFLINE due to missing heartbeat.", device.getDeviceId());
            }
        }
        
        log.info("OfflineDetectionJob finished. Marked {} devices as offline.", offlineCount);
    }
}
