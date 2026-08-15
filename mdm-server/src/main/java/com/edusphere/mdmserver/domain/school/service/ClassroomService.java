package com.edusphere.mdmserver.domain.school.service;

import com.edusphere.mdmserver.domain.school.dto.ClassroomDto;
import com.edusphere.mdmserver.domain.school.dto.CreateClassroomRequest;
import com.edusphere.mdmserver.domain.school.entity.School;
import com.edusphere.mdmserver.domain.school.entity.Classroom;
import com.edusphere.mdmserver.domain.school.repository.SchoolRepository;
import com.edusphere.mdmserver.domain.school.repository.ClassroomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edusphere.mdmserver.security.CustomUserDetails;
import org.springframework.security.access.AccessDeniedException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClassroomService {

    private final ClassroomRepository classroomRepository;
    private final SchoolRepository schoolRepository;

    @Transactional
    public ClassroomDto createClassroom(CreateClassroomRequest request, CustomUserDetails userDetails) {
        if (classroomRepository.existsByCode(request.getCode())) {
            throw new RuntimeException("Mã lớp học đã tồn tại: " + request.getCode());
        }

        School school = schoolRepository.getReferenceById(request.getSchoolId());

        validateSchoolAccess(school, userDetails);

        Classroom classroom = Classroom.builder()
                .school(school)
                .name(request.getName())
                .code(request.getCode())
                .build();

        return mapToDto(classroomRepository.save(classroom));
    }

    public List<ClassroomDto> getClassroomsBySchoolId(UUID schoolId, CustomUserDetails userDetails) {
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy trường học"));
        validateSchoolAccess(school, userDetails);

        return classroomRepository.findBySchoolId(schoolId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ClassroomDto updateClassroom(UUID id, CreateClassroomRequest request, CustomUserDetails userDetails) {
        Classroom classroom = classroomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học"));

        if (!classroom.getCode().equals(request.getCode()) && classroomRepository.existsByCode(request.getCode())) {
            throw new RuntimeException("Mã lớp học đã tồn tại: " + request.getCode());
        }

        validateSchoolAccess(classroom.getSchool(), userDetails);

        if (request.getSchoolId() != null && !classroom.getSchool().getId().equals(request.getSchoolId())) {
            School school = schoolRepository.findById(request.getSchoolId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy trường học mới"));
            validateSchoolAccess(school, userDetails);
            classroom.setSchool(school);
        }

        classroom.setName(request.getName());
        classroom.setCode(request.getCode());

        return mapToDto(classroomRepository.save(classroom));
    }

    @Transactional
    public void deleteClassroom(UUID id, CustomUserDetails userDetails) {
        Classroom classroom = classroomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học"));
        
        validateSchoolAccess(classroom.getSchool(), userDetails);

        // TODO: check if devices exist in this classroom
        classroomRepository.deleteById(id);
    }

    private ClassroomDto mapToDto(Classroom classroom) {
        return ClassroomDto.builder()
                .id(classroom.getId())
                .schoolId(classroom.getSchool().getId())
                .name(classroom.getName())
                .code(classroom.getCode())
                .build();
    }

    private void validateSchoolAccess(School school, CustomUserDetails userDetails) {
        switch (userDetails.getUser().getRole()) {
            case SUPER_ADMIN:
                break;
            case IT_ADMIN:
                if (userDetails.getUser().getCampus() == null ||
                    school.getCampus() == null ||
                    !userDetails.getUser().getCampus().getId().equals(school.getCampus().getId())) {
                    throw new AccessDeniedException("Bạn không có quyền thao tác trên trường học này (khác khu vực quản lý).");
                }
                break;
            case TEACHER:
                if (userDetails.getUser().getSchool() == null ||
                    !userDetails.getUser().getSchool().getId().equals(school.getId())) {
                    throw new AccessDeniedException("Bạn không có quyền thao tác trên trường học này (khác trường quản lý).");
                }
                break;
            default:
                throw new AccessDeniedException("Quyền không hợp lệ.");
        }
    }
}
