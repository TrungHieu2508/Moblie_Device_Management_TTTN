package com.edusphere.mdmserver.domain.command.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommandQueueService {

    private final RedisTemplate<String, Object> redisTemplate;
    
    private String getQueueKey(String deviceId) {
        return "device:" + deviceId + ":commands:pending";
    }

    /**
     * Push a command ID to the device's pending queue.
     */
    public void enqueueCommand(String deviceId, UUID commandId) {
        String key = getQueueKey(deviceId);
        redisTemplate.opsForList().rightPush(key, commandId.toString());
        log.debug("Enqueued command {} for device {}", commandId, deviceId);
    }

    /**
     * Get the count of pending commands for a device (O(1)).
     */
    public int getPendingCount(String deviceId) {
        Long size = redisTemplate.opsForList().size(getQueueKey(deviceId));
        return size != null ? size.intValue() : 0;
    }

    /**
     * Pop all pending command IDs from the queue.
     */
    public List<UUID> drainPendingCommands(String deviceId) {
        String key = getQueueKey(deviceId);
        String tempKey = key + ":temp:" + UUID.randomUUID();
        
        // RENAME is atomic. This prevents race conditions where new commands 
        // are pushed between range() and delete().
        Boolean hasKey = redisTemplate.hasKey(key);
        if (Boolean.FALSE.equals(hasKey)) return List.of();
        
        try {
            redisTemplate.rename(key, tempKey);
        } catch (Exception e) {
            // Key might have been deleted/drained by another concurrent thread
            return List.of();
        }
        
        List<Object> commandIdsStr = redisTemplate.opsForList().range(tempKey, 0, -1);
        redisTemplate.delete(tempKey);
        
        if (commandIdsStr != null && !commandIdsStr.isEmpty()) {
            return commandIdsStr.stream()
                    .map(id -> UUID.fromString(id.toString()))
                    .collect(Collectors.toList());
        }
        
        return List.of();
    }
}
