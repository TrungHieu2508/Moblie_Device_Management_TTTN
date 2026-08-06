package com.edusphere.mdmserver.domain.school.service;

import com.edusphere.mdmserver.domain.school.dto.CreateSchoolRequest;
import com.edusphere.mdmserver.domain.school.dto.SchoolDto;
import com.edusphere.mdmserver.domain.school.entity.School;
import com.edusphere.mdmserver.domain.school.repository.SchoolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SchoolService {

    private final SchoolRepository schoolRepository;

    @Transactional
    public SchoolDto createSchool(CreateSchoolRequest request) {
        if (schoolRepository.existsByCode(request.getCode())) {
            throw new RuntimeException("Mã trường đã tồn tại: " + request.getCode());
        }

        School school = School.builder()
                .name(request.getName())
                .code(request.getCode())
                .address(request.getAddress())
                .phone(request.getPhone())
                .email(request.getEmail())
                .build();

        School saved = schoolRepository.save(school);
        return mapToDto(saved);
    }

    public Page<SchoolDto> getAllSchools(Pageable pageable) {
        return schoolRepository.findAll(pageable).map(this::mapToDto);
    }

    public SchoolDto getSchoolById(UUID id) {
        School school = schoolRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy trường học"));
        return mapToDto(school);
    }

    @Transactional
    public SchoolDto updateSchool(UUID id, CreateSchoolRequest request) {
        School school = schoolRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy trường học"));
        
        if (!school.getCode().equals(request.getCode()) && schoolRepository.existsByCode(request.getCode())) {
            throw new RuntimeException("Mã trường đã tồn tại: " + request.getCode());
        }

        school.setName(request.getName());
        school.setCode(request.getCode());
        school.setAddress(request.getAddress());
        school.setPhone(request.getPhone());
        school.setEmail(request.getEmail());

        return mapToDto(schoolRepository.save(school));
    }

    @Transactional
    public void deleteSchool(UUID id) {
        School school = schoolRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy trường học"));
        // TODO: Validate if school has devices or campuses before deleting
        schoolRepository.delete(school);
    }

    private SchoolDto mapToDto(School school) {
        return SchoolDto.builder()
                .id(school.getId())
                .name(school.getName())
                .code(school.getCode())
                .address(school.getAddress())
                .phone(school.getPhone())
                .email(school.getEmail())
                .build();
    }
}
