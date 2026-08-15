package com.edusphere.mdmserver.domain.school.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateClassroomRequest {
    private UUID schoolId;
    
    @NotBlank(message = "Tên lớp không được để trống")
    private String name;
    
    @NotBlank(message = "Mã lớp không được để trống")
    private String code;
}
