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

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import java.util.ArrayList;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class OfflineDetectionJob {

    private final DeviceRepository deviceRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final com.edusphere.mdmserver.domain.websocket.service.WebSocketNotificationService notificationService;

    // Runs every 60 seconds
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void detectOfflineDevices() {
        log.debug("Running OfflineDetectionJob...");
        
        List<DeviceStatus> activeStatuses = List.of(
                DeviceStatus.ONLINE, 
                DeviceStatus.WARNING, 
                DeviceStatus.CRITICAL
        );
        
        int offlineCount = 0;
        int page = 0;
        int size = 1000; // Xử lý mỗi 1000 thiết bị cùng lúc (Batch Size)
        
        Slice<String> deviceIdSlice;
        
        do {
            // 1. Kéo 1000 ID từ DB (Không kéo nguyên mảng Object để tiết kiệm 95% RAM)
            deviceIdSlice = deviceRepository.findDeviceIdsByStatusIn(activeStatuses, PageRequest.of(page, size));
            List<String> deviceIds = deviceIdSlice.getContent();
            
            if (deviceIds.isEmpty()) break;

            // 2. Gom tất cả Redis Keys lại
            List<String> redisKeys = deviceIds.stream()
                    .map(id -> "device:" + id + ":status")
                    .collect(Collectors.toList());

            // 3. MultiGet (Pipeline) - Hỏi Redis 1000 keys trong ĐÚNG 1 LẦN gửi mạng (O(1) thay vì O(N))
            List<Object> redisValues = redisTemplate.opsForValue().multiGet(redisKeys);
            
            List<String> offlineDeviceIds = new ArrayList<>();
            
            // 4. Lọc ra những ID không tồn tại trong Redis (nghĩa là đã hết hạn)
            for (int i = 0; i < deviceIds.size(); i++) {
                if (redisValues == null || redisValues.get(i) == null) {
                    offlineDeviceIds.add(deviceIds.get(i));
                }
            }
            
            // 5. Bulk Update DB (Gộp tất cả lệnh UPDATE vào 1 câu SQL duy nhất)
            if (!offlineDeviceIds.isEmpty()) {
                deviceRepository.updateStatusForDeviceIds(DeviceStatus.OFFLINE, offlineDeviceIds);
                offlineCount += offlineDeviceIds.size();
                log.debug("Batch updated {} devices to OFFLINE.", offlineDeviceIds.size());
                
                // Broadcast OFFLINE status to Web Dashboard
                for (String id : offlineDeviceIds) {
                    notificationService.notifyDeviceStatusChange(id, 
                            java.util.Map.of("deviceId", id, "status", "OFFLINE"));
                }
            }
            
            page++;
        } while (deviceIdSlice.hasNext());
        
        if (offlineCount > 0) {
            log.info("OfflineDetectionJob finished. Marked {} devices as offline.", offlineCount);
        }
    }
}
