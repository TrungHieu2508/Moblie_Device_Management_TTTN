package com.edusphere.mdmserver.domain.school.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class CampusDto {
    private UUID id;
    private UUID schoolId;
    private String name;
    private String code;
    private String address;
}
