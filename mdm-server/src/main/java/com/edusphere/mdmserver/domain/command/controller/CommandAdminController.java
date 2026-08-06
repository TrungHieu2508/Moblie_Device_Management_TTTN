package com.edusphere.mdmserver.domain.command.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.command.dto.CommandCreateRequest;
import com.edusphere.mdmserver.domain.command.dto.CommandDto;
import com.edusphere.mdmserver.domain.command.service.CommandService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/devices/{deviceId}/commands")
@RequiredArgsConstructor
public class CommandAdminController {

    private final CommandService commandService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'IT_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<CommandDto>> sendCommand(
            @PathVariable UUID deviceId,
            @Valid @RequestBody CommandCreateRequest request,
            Principal principal) {
        
        CommandDto command = commandService.createCommand(deviceId, request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(command, "Đã khởi tạo lệnh điều khiển"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'IT_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Page<CommandDto>>> getCommandHistory(
            @PathVariable UUID deviceId,
            Pageable pageable) {
        
        Page<CommandDto> history = commandService.getCommandHistory(deviceId, pageable);
        return ResponseEntity.ok(ApiResponse.success(history, "Success"));
    }
}
