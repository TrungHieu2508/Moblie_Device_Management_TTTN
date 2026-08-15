package com.edusphere.mdmserver.domain.school.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
public class ScheduleSessionRequest {
    @NotNull(message = "Lớp học không được để trống")
    private UUID classroomId;

    @NotNull(message = "Giáo viên không được để trống")
    private UUID teacherId;

    @NotNull(message = "Thời gian bắt đầu dự kiến không được để trống")
    private Instant scheduledStartTime;

    @NotNull(message = "Thời gian kết thúc dự kiến không được để trống")
    private Instant scheduledEndTime;
}
