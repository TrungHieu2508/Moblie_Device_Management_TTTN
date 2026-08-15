package com.edusphere.mdmserver.domain.school.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassSessionDto {
    private UUID id;
    private UUID classroomId;
    private String classroomName;
    private UUID teacherId;
    private String teacherName;
    private String status;
    private Instant startedAt;
    private Instant endedAt;
    private Instant scheduledStartTime;
    private Instant scheduledEndTime;
}
