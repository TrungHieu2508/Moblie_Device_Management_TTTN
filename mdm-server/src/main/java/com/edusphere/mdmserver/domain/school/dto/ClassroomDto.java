package com.edusphere.mdmserver.domain.school.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class ClassroomDto {
    private UUID id;
    private UUID schoolId;
    private String schoolName;
    private String campusName;
    private String name;
    private String code;
}
