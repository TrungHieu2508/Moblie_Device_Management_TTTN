package com.edusphere.mdmserver.domain.school.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class SchoolDto {
    private UUID id;
    private UUID campusId;
    private String campusName;
    private String name;
    private String code;
    private String address;
    private String phone;
    private String email;
}
