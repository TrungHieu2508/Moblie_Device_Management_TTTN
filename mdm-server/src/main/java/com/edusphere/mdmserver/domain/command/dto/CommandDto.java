package com.edusphere.mdmserver.domain.command.dto;

import com.edusphere.mdmserver.domain.command.enums.CommandStatus;
import com.edusphere.mdmserver.domain.command.enums.CommandType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class CommandDto {
    private UUID id;
    private String deviceId;
    private CommandType commandType;
    private Map<String, Object> payload;
    private CommandStatus status;
    private String errorMessage;
    private Instant createdAt;
    private Instant sentAt;
    private Instant acknowledgedAt;
    private Instant executedAt;
    private String createdBy;
}
