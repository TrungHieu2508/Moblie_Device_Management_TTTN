package com.edusphere.mdmserver.domain.school.service;

import com.edusphere.mdmserver.domain.school.dto.CampusDto;
import com.edusphere.mdmserver.domain.school.dto.CreateCampusRequest;
import com.edusphere.mdmserver.domain.school.entity.Campus;
import com.edusphere.mdmserver.domain.school.entity.School;
import com.edusphere.mdmserver.domain.school.repository.CampusRepository;
import com.edusphere.mdmserver.domain.school.repository.SchoolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CampusService {

    private final CampusRepository campusRepository;
    private final SchoolRepository schoolRepository;

    @Transactional
    public CampusDto createCampus(CreateCampusRequest request) {
        School school = schoolRepository.getReferenceById(request.getSchoolId());

        Campus campus = Campus.builder()
                .school(school)
                .name(request.getName())
                .code(request.getCode())
                .address(request.getAddress())
                .build();

        return mapToDto(campusRepository.save(campus));
    }

    public List<CampusDto> getCampusesBySchoolId(UUID schoolId) {
        return campusRepository.findBySchoolId(schoolId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public CampusDto updateCampus(UUID id, CreateCampusRequest request) {
        Campus campus = campusRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cơ sở"));

        if (!campus.getSchool().getId().equals(request.getSchoolId())) {
            School school = schoolRepository.findById(request.getSchoolId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy trường học mới"));
            campus.setSchool(school);
        }

        if (!campus.getCode().equals(request.getCode()) && campusRepository.existsByCode(request.getCode())) {
            throw new RuntimeException("Mã cơ sở đã tồn tại: " + request.getCode());
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
        // TODO: check if classrooms exist
        campusRepository.deleteById(id);
    }

    private CampusDto mapToDto(Campus campus) {
        return CampusDto.builder()
                .id(campus.getId())
                .schoolId(campus.getSchool().getId())
                .name(campus.getName())
                .code(campus.getCode())
                .address(campus.getAddress())
                .build();
    }
}
