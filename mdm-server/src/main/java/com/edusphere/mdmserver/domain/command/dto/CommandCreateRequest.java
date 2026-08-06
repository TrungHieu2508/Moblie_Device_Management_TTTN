package com.edusphere.mdmserver.domain.command.dto;

import com.edusphere.mdmserver.domain.command.enums.CommandType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class CommandCreateRequest {
    @NotNull(message = "Loại lệnh không được để trống")
    private CommandType commandType;
    
    private Map<String, Object> payload;
}
