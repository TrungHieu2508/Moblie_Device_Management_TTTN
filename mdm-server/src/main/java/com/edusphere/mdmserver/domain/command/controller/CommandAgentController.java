package com.edusphere.mdmserver.domain.command.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.command.dto.CommandAckRequest;
import com.edusphere.mdmserver.domain.command.dto.CommandDto;
import com.edusphere.mdmserver.domain.command.service.CommandService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/agent/commands")
@RequiredArgsConstructor
public class CommandAgentController {

    private final CommandService commandService;

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<CommandDto>>> getPendingCommands(Principal principal) {
        String deviceId = principal.getName(); // JWT device token contains deviceId as Subject
        List<CommandDto> commands = commandService.getPendingCommandsForAgent(deviceId);
        return ResponseEntity.ok(ApiResponse.success(commands, "Success"));
    }

    @PostMapping("/{commandId}/ack")
    public ResponseEntity<ApiResponse<Void>> acknowledgeCommand(
            @PathVariable UUID commandId,
            @Valid @RequestBody CommandAckRequest request,
            Principal principal) {
        
        String deviceId = principal.getName();
        commandService.acknowledgeCommand(deviceId, commandId, request);
        return ResponseEntity.ok(ApiResponse.success(null, "Command acknowledged"));
    }
}
