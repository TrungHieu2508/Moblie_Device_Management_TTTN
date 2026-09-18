package com.edusphere.mdmserver.domain.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ViolationDataDto {
    private String name; // e.g., "T2", "T3" (Day of week)
    private long locked; // mapped to 'Khóa máy'
    private long gaming; // mapped to 'Chơi Game'
}
