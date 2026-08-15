package com.edusphere.mdmserver.domain.school.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class CreateSchoolRequest {
    @NotNull(message = "ID của Khu vực (Campus) không được để trống")
    private UUID campusId;

    @NotBlank(message = "Tên trường không được để trống")
    private String name;
    
    @NotBlank(message = "Mã trường không được để trống")
    private String code;
    
    private String address;
    private String phone;
    private String email;
}
