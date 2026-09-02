package com.edusphere.mdmserver.domain.command.service;

import com.edusphere.mdmserver.domain.command.dto.CommandAckRequest;
import com.edusphere.mdmserver.domain.command.dto.CommandCreateRequest;
import com.edusphere.mdmserver.domain.command.dto.CommandDto;
import com.edusphere.mdmserver.domain.command.entity.DeviceCommand;
import com.edusphere.mdmserver.domain.command.enums.CommandStatus;
import com.edusphere.mdmserver.domain.command.repository.DeviceCommandRepository;
import com.edusphere.mdmserver.domain.device.entity.Device;
import com.edusphere.mdmserver.domain.device.enums.DeviceStatus;
import com.edusphere.mdmserver.domain.device.repository.DeviceRepository;
import com.edusphere.mdmserver.domain.alert.service.AlertService;
import com.edusphere.mdmserver.domain.user.entity.User;
import com.edusphere.mdmserver.domain.user.repository.UserRepository;
import com.edusphere.mdmserver.domain.websocket.service.WebSocketNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommandService {

    private final DeviceCommandRepository commandRepository;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final CommandQueueService commandQueueService;
    private final WebSocketNotificationService wsNotificationService;
    private final AlertService alertService;

    @Transactional
    public CommandDto createCommand(UUID deviceUuid, CommandCreateRequest request, String username) {
        Device device = deviceRepository.findById(deviceUuid)
                .orElseThrow(() -> new IllegalArgumentException("Thiết bị không tồn tại"));

        User user = null;
        if (username != null && !username.isEmpty() && !username.equals("system")) {
            user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("User không tồn tại"));
        }

        DeviceCommand command = DeviceCommand.builder()
                .device(device)
                .commandType(request.getCommandType())
                .payload(request.getPayload())
                .status(CommandStatus.PENDING)
                .createdBy(user)
                .build();

        command = commandRepository.save(command);

        dispatchCommand(command, device);

        // Record an alert if this is a manual action that implies a violation/punishment
        String cmdType = request.getCommandType().name();
        if ("LOCK_SCREEN".equals(cmdType) || 
            "RING_ALARM".equals(cmdType) || 
            "WIPE_DATA".equals(cmdType)) {
            alertService.createManualAlert(device, cmdType, user);
        }

        return mapToDto(command);
    }

    private void dispatchCommand(DeviceCommand command, Device device) {
        if (device.getStatus() == DeviceStatus.ONLINE || device.getStatus() == DeviceStatus.WARNING || device.getStatus() == DeviceStatus.CRITICAL) {
            // Thiết bị đang hoạt động (Online/Warning/Critical) -> Gửi qua WebSocket ngay lập tức
            try {
                wsNotificationService.sendCommandToDevice(device.getDeviceId(), mapToDto(command));
                
                command.setStatus(CommandStatus.SENT);
                command.setSentAt(Instant.now());
                commandRepository.save(command);
                
                log.info("Dispatched command {} to online device {}", command.getId(), device.getDeviceId());
            } catch (Exception e) {
                log.error("Failed to dispatch command to online device {}, falling back to Queue", device.getDeviceId(), e);
                queueCommand(command, device);
            }
        } else {
            // Thiết bị offline -> Nhét vào Redis Queue
            queueCommand(command, device);
        }
    }

    private void queueCommand(DeviceCommand command, Device device) {
        commandQueueService.enqueueCommand(device.getDeviceId(), command.getId());
        log.info("Queued command {} for offline device {}", command.getId(), device.getDeviceId());
    }

    @Transactional
    public List<CommandDto> getPendingCommandsForAgent(String deviceId) {
        // Pop all command IDs from Redis
        List<UUID> pendingCommandIds = commandQueueService.drainPendingCommands(deviceId);
        
        if (pendingCommandIds.isEmpty()) {
            return List.of();
        }

        // Fetch from DB
        List<DeviceCommand> commands = commandRepository.findAllById(pendingCommandIds);
        
        // Update status to SENT
        Instant now = Instant.now();
        for (DeviceCommand cmd : commands) {
            if (cmd.getStatus() == CommandStatus.PENDING) {
                cmd.setStatus(CommandStatus.SENT);
                cmd.setSentAt(now);
            }
        }
        
        commandRepository.saveAll(commands);
        
        log.info("Agent {} fetched {} pending commands", deviceId, commands.size());
        
        return commands.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional
    public void acknowledgeCommand(String deviceId, UUID commandId, CommandAckRequest request) {
        DeviceCommand command = commandRepository.findById(commandId)
                .orElseThrow(() -> new IllegalArgumentException("Lệnh không tồn tại"));

        if (!command.getDevice().getDeviceId().equals(deviceId)) {
            throw new IllegalArgumentException("Command ID không thuộc về thiết bị này");
        }

        command.setStatus(request.getStatus());
        command.setErrorMessage(request.getErrorMessage());

        if (request.getStatus() == CommandStatus.ACKNOWLEDGED) {
            command.setAcknowledgedAt(Instant.now());
        } else if (request.getStatus() == CommandStatus.EXECUTED || request.getStatus() == CommandStatus.FAILED) {
            command.setExecutedAt(Instant.now());
        }

        commandRepository.save(command);
        log.info("Command {} for device {} updated to status {}", commandId, deviceId, request.getStatus());
    }

    public Page<CommandDto> getCommandHistory(UUID deviceId, Pageable pageable) {
        return commandRepository.findByDeviceId(deviceId, pageable).map(this::mapToDto);
    }

    private CommandDto mapToDto(DeviceCommand command) {
        return CommandDto.builder()
                .id(command.getId())
                .deviceId(command.getDevice().getDeviceId())
                .commandType(command.getCommandType())
                .payload(command.getPayload())
                .status(command.getStatus())
                .errorMessage(command.getErrorMessage())
                .createdAt(command.getCreatedAt())
                .sentAt(command.getSentAt())
                .acknowledgedAt(command.getAcknowledgedAt())
                .executedAt(command.getExecutedAt())
                .createdBy(command.getCreatedBy() != null ? command.getCreatedBy().getUsername() : null)
                .build();
    }
}
