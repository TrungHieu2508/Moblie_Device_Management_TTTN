package com.edusphere.mdmserver.domain.school.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateClassroomRequest {
    @NotNull(message = "ID của cơ sở không được để trống")
    private UUID campusId;
    
    @NotBlank(message = "Tên lớp không được để trống")
    private String name;
    
    @NotBlank(message = "Mã lớp không được để trống")
    private String code;
}
