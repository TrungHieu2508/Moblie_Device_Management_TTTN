package com.edusphere.mdmserver.domain.command.dto;

import com.edusphere.mdmserver.domain.command.enums.CommandStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CommandAckRequest {
    @NotNull(message = "Trạng thái lệnh không được để trống")
    private CommandStatus status;
    
    private String errorMessage;
}
