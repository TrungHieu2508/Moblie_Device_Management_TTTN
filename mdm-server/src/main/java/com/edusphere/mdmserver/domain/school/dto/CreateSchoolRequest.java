package com.edusphere.mdmserver.domain.school.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateSchoolRequest {
    @NotBlank(message = "Tên trường không được để trống")
    private String name;
    
    @NotBlank(message = "Mã trường không được để trống")
    private String code;
    
    private String address;
    private String phone;
    private String email;
}
