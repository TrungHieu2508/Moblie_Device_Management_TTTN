package com.edusphere.mdmserver.domain.school.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateCampusRequest {

    @NotBlank(message = "Tên cơ sở không được để trống")
    private String name;
    
    @NotBlank(message = "Mã cơ sở không được để trống")
    private String code;
    
    private String address;
}
