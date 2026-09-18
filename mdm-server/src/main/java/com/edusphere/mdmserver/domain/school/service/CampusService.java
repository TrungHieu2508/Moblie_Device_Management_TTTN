package com.edusphere.mdmserver.domain.school.service;

import com.edusphere.mdmserver.domain.school.dto.CampusDto;
import com.edusphere.mdmserver.domain.school.dto.CreateCampusRequest;
import com.edusphere.mdmserver.domain.school.entity.Campus;
import com.edusphere.mdmserver.domain.school.repository.CampusRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CampusService {

    private final CampusRepository campusRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public CampusDto createCampus(CreateCampusRequest request) {
        if (campusRepository.existsByCode(request.getCode())) {
            throw new RuntimeException("Mã cơ sở đã tồn tại: " + request.getCode());
        }
        if (campusRepository.existsByName(request.getName())) {
            throw new RuntimeException("Tên cơ sở đã tồn tại: " + request.getName());
        }

        Campus campus = Campus.builder()
                .name(request.getName())
                .code(request.getCode())
                .address(request.getAddress())
                .build();

        return mapToDto(campusRepository.save(campus));
    }

    public List<CampusDto> getAllCampuses() {
        return campusRepository.findAll()
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public CampusDto updateCampus(UUID id, CreateCampusRequest request) {
        Campus campus = campusRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cơ sở"));

        if (!campus.getCode().equals(request.getCode()) && campusRepository.existsByCode(request.getCode())) {
            throw new RuntimeException("Mã cơ sở đã tồn tại: " + request.getCode());
        }
        if (!campus.getName().equals(request.getName()) && campusRepository.existsByName(request.getName())) {
            throw new RuntimeException("Tên cơ sở đã tồn tại: " + request.getName());
        }

        campus.setName(request.getName());
        campus.setCode(request.getCode());
        campus.setAddress(request.getAddress());

        return mapToDto(campusRepository.save(campus));
    }

    @Transactional
    public void deleteCampus(UUID id) {
        if (!campusRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy cơ sở");
        }

        // 1. Unassign users from this campus
        jdbcTemplate.update("UPDATE users SET campus_id = NULL WHERE campus_id = ?", id);

        // 2. Delete all enrollment profiles in this campus
        try { jdbcTemplate.update("DELETE FROM enrollment_profiles WHERE campus_id = ?", id); } catch (Exception e) {
            log.debug("enrollment_profiles delete by campus_id: {}", e.getMessage());
        }

        // 3. Get all schools in this campus
        List<UUID> schoolIds = jdbcTemplate.queryForList(
                "SELECT id FROM schools WHERE campus_id = ?", UUID.class, id);

        for (UUID schoolId : schoolIds) {
            // Get all classrooms in this school
            List<UUID> classroomIds = jdbcTemplate.queryForList(
                    "SELECT id FROM classrooms WHERE school_id = ?", UUID.class, schoolId);

            for (UUID classroomId : classroomIds) {
                jdbcTemplate.update("UPDATE devices SET classroom_id = NULL WHERE classroom_id = ?", classroomId);
                try { jdbcTemplate.update("DELETE FROM class_sessions WHERE classroom_id = ?", classroomId); } catch (Exception e) {
                    log.debug("class_sessions delete: {}", e.getMessage());
                }
            }

            jdbcTemplate.update("UPDATE devices SET school_id = NULL, campus_id = NULL WHERE school_id = ?", schoolId);
            jdbcTemplate.update("DELETE FROM classrooms WHERE school_id = ?", schoolId);
        }

        // 4. Delete all schools in this campus
        jdbcTemplate.update("DELETE FROM schools WHERE campus_id = ?", id);

        // 5. Delete campus itself
        campusRepository.deleteById(id);
    }

    private CampusDto mapToDto(Campus campus) {
        return CampusDto.builder()
                .id(campus.getId())
                .name(campus.getName())
                .code(campus.getCode())
                .address(campus.getAddress())
                .build();
    }
}
