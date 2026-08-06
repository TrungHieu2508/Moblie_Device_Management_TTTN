package com.edusphere.mdmserver.domain.command.job;

import com.edusphere.mdmserver.domain.command.entity.DeviceCommand;
import com.edusphere.mdmserver.domain.command.repository.DeviceCommandRepository;
import com.edusphere.mdmserver.domain.command.service.CommandQueueService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class CommandRetryJob {

    private final DeviceCommandRepository commandRepository;
    private final CommandQueueService commandQueueService;

    // Chạy mỗi 5 phút
    @Scheduled(fixedRate = 300000)
    @Transactional
    public void retryStuckCommands() {
        log.debug("Running CommandRetryJob...");
        
        // Ngưỡng 5 phút. Lệnh nào SENT quá 5 phút mà chưa ACK thì coi như kẹt.
        Instant threshold = Instant.now().minus(5, ChronoUnit.MINUTES);
        
        List<DeviceCommand> stuckCommands = commandRepository.findStuckCommands(threshold);
        
        if (stuckCommands.isEmpty()) return;
        
        List<java.util.UUID> stuckCommandIds = new java.util.ArrayList<>();
        
        for (DeviceCommand cmd : stuckCommands) {
            String deviceId = cmd.getDevice().getDeviceId();
            commandQueueService.enqueueCommand(deviceId, cmd.getId());
            stuckCommandIds.add(cmd.getId());
        }
        
        int resetCount = commandRepository.resetStuckCommands(stuckCommandIds);
        
        log.warn("CommandRetryJob reset {} stuck SENT commands back to PENDING and requeued them.", resetCount);
    }
}
